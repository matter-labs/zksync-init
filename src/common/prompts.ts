import chalk from "chalk";
import inquirer from "inquirer";

import { getChains, promptAddNewChain } from "../commands/config/chains.js";
import { l2Chains } from "../data/chains.js";
import { formatSeparator } from "../utils/formatters.js";

import type { L2Chain } from "../data/chains.js";

export const promptChain = async <
  T extends Record<string, unknown> | undefined,
>(
  prompt: { message: string; name: string },
  chains?: { filter?: (chain: L2Chain) => boolean },
  options?: T
): Promise<L2Chain> => {
  const customChains = getChains();
  const allChains = [...l2Chains, ...customChains];

  if (options?.[prompt.name]) {
    const chain = allChains.find(
      (chain) => chain.network === options[prompt.name]
    );
    if (chain) {
      return chain;
    } else {
      throw new Error(`Chain "${options[prompt.name]}" wasn't found`);
    }
  }

  const answers = await inquirer.prompt(
    [
      {
        message: prompt.message,
        name: prompt.name,
        type: "list",
        loop: false,
        choices: [
          ...l2Chains.filter(chains?.filter || (() => true)).map((chain) => ({
            name: chain.name,
            value: chain.network,
          })),
          formatSeparator("Custom chains"),
          ...customChains
            .filter(chains?.filter || (() => true))
            .map((chain) => ({
              name: chain.name + chalk.gray(` - ${chain.network}`),
              value: chain.network,
            })),
          {
            name: chalk.greenBright("+") + " Add new chain",
            short: "Add new chain",
            value: "add-new-chain",
          },
        ],
        required: true,
      },
    ],
    options
  );
  const response = answers[prompt.name];

  let chain: L2Chain | undefined;
  if (response === "add-new-chain") {
    chain = await promptAddNewChain();
  } else {
    chain = allChains.find((chain) => chain.network === response)!;
  }

  if (options) {
    options[prompt.name] = chain.network;
  }

  return chain;
};
