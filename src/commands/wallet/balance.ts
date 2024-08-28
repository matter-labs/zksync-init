import chalk from "chalk";
import inquirer from "inquirer";

import {
  accountOption,
  chainOption,
  l2RpcUrlOption,
  tokenOption,
  zeekOption,
} from "../../common/options.js";
import { l2Chains } from "../../data/chains.js";
import { ETH_TOKEN } from "../../utils/constants.js";
import { useDecimals } from "../../utils/formatters.js";
import { getL2Provider, optionNameToParam } from "../../utils/helpers.js";
import Logger from "../../utils/logger.js";
import { getBalance, getTokenInfo } from "../../utils/token.js";
import { isAddress } from "../../utils/validators.js";
import zeek from "../../utils/zeek.js";
import { getChains } from "../config/chains.js";
import Program from "./command.js";

import type { DefaultOptions } from "../../common/options.js";

type BalanceOptions = DefaultOptions & {
  chain?: string;
  rpc?: string;
  address?: string;
  token?: string;
};

export const handler = async (options: BalanceOptions) => {
  try {
    const chains = [...l2Chains, ...getChains()];
    const answers: BalanceOptions = await inquirer.prompt(
      [
        {
          message: chainOption.description,
          name: optionNameToParam(chainOption.long!),
          type: "list",
          choices: chains.map((e) => ({ name: e.name, value: e.network })),
          required: true,
          when(answers: BalanceOptions) {
            if (answers.rpc) {
              return false;
            }
            return true;
          },
        },
        {
          message: accountOption.description,
          name: optionNameToParam(accountOption.long!),
          type: "input",
          required: true,
          validate: (input: string) => isAddress(input),
        },
      ],
      options
    );

    options = {
      ...options,
      ...answers,
    };

    const selectedChain = chains.find((e) => e.network === options.chain);
    const l2Provider = getL2Provider(options.rpc ?? selectedChain!.rpcUrl);
    const token = options.token
      ? await getTokenInfo(options.token!, l2Provider)
      : ETH_TOKEN;
    if (!token.address) {
      throw new Error(
        `Token ${token.symbol} does not exist on ${selectedChain?.name}`
      );
    }

    const { bigNumberToDecimal } = useDecimals(token.decimals);

    const balance = await getBalance(
      token.address,
      options.address!,
      l2Provider
    );
    Logger.info(
      `\n${selectedChain?.name} Balance: ${bigNumberToDecimal(balance)} ${token.symbol} ${
        token.name ? chalk.gray(`(${token.name})`) : ""
      }`
    );

    if (options.zeek) {
      zeek();
    }
  } catch (error) {
    Logger.error(
      "There was an error while fetching balance for the specified address:"
    );
    Logger.error(error);
  }
};

Program.command("balance")
  .description("Get token balance of an L2 account")
  .addOption(chainOption)
  .addOption(l2RpcUrlOption)
  .addOption(accountOption)
  .addOption(tokenOption)
  .addOption(zeekOption)
  .action(handler);
