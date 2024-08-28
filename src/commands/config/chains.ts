import chalk from "chalk";
import inquirer from "inquirer";
import slugify from "slugify";

import { configHandler } from "../../common/ConfigHandler.js";
import { l2Chains } from "../../data/chains.js";
import Logger from "../../utils/logger.js";
import { isUrl } from "../../utils/validators.js";
import Program from "./command.js";

import type { Chain, L2Chain } from "../../data/chains.js";

export const getChains = () => {
  return configHandler.getConfigValue<L2Chain[]>("chains") || [];
};
const saveChains = (chains: L2Chain[]) => {
  configHandler.setConfigValue("chains", chains);
};

const validateChainId = (value: string) => {
  if (isNaN(parseInt(value))) {
    return "Chain id must be a number";
  }
  if (parseInt(value).toString() !== value.toString()) {
    return "Chain id must be an integer";
  }
  if (parseInt(value) < 0) {
    return "Chain id must be a positive integer";
  }
  return true;
};

export const promptAddNewChain = async (defaults?: L2Chain) => {
  const chains = getChains();
  const { id, name }: { id: string; name: string } = await inquirer.prompt([
    {
      message: "Chain id",
      name: "id",
      type: "input",
      default: defaults?.id,
      required: true,
      validate: validateChainId,
    },
    {
      message: "Chain name",
      name: "name",
      type: "input",
      default: defaults?.name,
      required: true,
      validate: (value: string) => {
        if (!value) {
          return "Chain name is required";
        }
        if (defaults?.name === value) {
          return true;
        }
        if (
          [...getChains(), ...l2Chains].find((chain) => chain.name === value)
        ) {
          return "Chain name already exists";
        }
        return true;
      },
    },
  ]);
  const {
    network,
    rpcUrl,
    explorerUrl,
  }: { network: string; rpcUrl: string; explorerUrl: string } =
    await inquirer.prompt([
      {
        message: "Chain key",
        default:
          defaults?.network ||
          slugify.default(name, {
            lower: true,
            replacement: "-",
            strict: true,
          }),
        name: "network",
        type: "input",
        required: true,
        validate: (value: string) => {
          if (!value) {
            return "Chain key is required";
          }
          if (defaults?.network === value) {
            return true;
          }
          if (
            [...getChains(), ...l2Chains].find(
              (chain) => chain.network === value
            )
          ) {
            return "Chain key already exists";
          }
          return true;
        },
      },
      {
        message: "Chain RPC URL",
        name: "rpcUrl",
        type: "input",
        default: defaults?.rpcUrl,
        required: true,
        validate: (input: string) => isUrl(input),
      },
      {
        message: "Chain explorer URL" + chalk.gray(" (optional)"),
        name: "explorerUrl",
        type: "input",
        default: defaults?.explorerUrl,
        required: false,
        validate: (input: string) => {
          if (input) {
            return isUrl(input);
          }
          return true;
        },
      },
    ]);
  const newChain: L2Chain = {
    id: parseInt(id),
    name,
    network,
    rpcUrl,
    explorerUrl: explorerUrl || undefined,
  };
  const { hasL1Chain }: { hasL1Chain: "yes" | "no" } = await inquirer.prompt([
    {
      message: "Is this chain connected to L1",
      name: "hasL1Chain",
      type: "list",
      default: defaults?.l1Chain ? "yes" : "no",
      choices: [
        {
          name: `No ${chalk.gray("- skip adding L1 chain info")}`,
          short: "No",
          value: "no",
        },
        {
          name: `Yes ${chalk.gray("- add L1 chain info")}`,
          short: "Yes",
          value: "yes",
        },
      ],
      required: true,
    },
  ]);
  if (hasL1Chain === "yes") {
    const { l1_id, l1_name }: { l1_id: string; l1_name: string } =
      await inquirer.prompt([
        {
          message: "L1 Chain id",
          name: "l1_id",
          type: "input",
          default: defaults?.l1Chain?.id,
          required: true,
          validate: validateChainId,
        },
        {
          message: "L1 Chain name",
          name: "l1_name",
          type: "input",
          default: defaults?.l1Chain?.name,
          required: true,
          validate: (value: string) => {
            if (!value) {
              return "Chain name is required";
            }
            return true;
          },
        },
      ]);
    const {
      l1_network,
      l1_rpcUrl,
      l1_explorerUrl,
    }: { l1_network: string; l1_rpcUrl: string; l1_explorerUrl: string } =
      await inquirer.prompt([
        {
          message: "L1 Chain key",
          default:
            defaults?.l1Chain?.network ||
            slugify.default(l1_name, {
              lower: true,
              replacement: "-",
              strict: true,
            }),
          name: "l1_network",
          type: "input",
          required: true,
          validate: (value: string) => {
            if (!value) {
              return "Chain key is required";
            }
            return true;
          },
        },
        {
          message: "L1 Chain RPC URL",
          name: "l1_rpcUrl",
          type: "input",
          default: defaults?.l1Chain?.rpcUrl,
          required: true,
          validate: (input: string) => isUrl(input),
        },
        {
          message: "L1 Chain explorer URL" + chalk.gray(" (optional)"),
          name: "l1_explorerUrl",
          type: "input",
          default: defaults?.l1Chain?.explorerUrl,
          required: false,
          validate: (input: string) => {
            if (input) {
              return isUrl(input);
            }
            return true;
          },
        },
      ]);
    const l1Chain: Chain = {
      id: parseInt(l1_id),
      name: l1_name,
      network: l1_network,
      rpcUrl: l1_rpcUrl,
      explorerUrl: l1_explorerUrl || undefined,
    };
    newChain.l1Chain = l1Chain;
  }

  saveChains([
    newChain,
    ...chains.filter((e) => e.network !== defaults?.network),
  ]);
  Logger.info(`${chalk.greenBright("✔")} Chain "${name}" saved`);
  return newChain;
};
const promptDeleteChain = async (chain: L2Chain) => {
  const { confirm }: { confirm: boolean } = await inquirer.prompt([
    {
      message: `Are you sure you want to delete chain - "${chain.name}"?`,
      name: "confirm",
      type: "confirm",
      required: true,
    },
  ]);
  if (confirm) {
    saveChains(getChains().filter((e) => e.network !== chain.network));
    Logger.info(`${chalk.greenBright("✔")} Chain "${chain.name}" deleted`);
  }
};
const promptAskChainAction = async (chain: L2Chain) => {
  // ask delete or edit
  const { action }: { action: "edit" | "delete" } = await inquirer.prompt([
    {
      message: "What do you want to do?",
      name: "action",
      type: "list",
      choices: [
        {
          name: "Edit",
          value: "edit",
        },
        {
          name: "Delete",
          value: "delete",
        },
      ],
      required: true,
    },
  ]);
  if (action === "edit") {
    await promptAddNewChain(chain);
  } else if (action === "delete") {
    await promptDeleteChain(chain);
  }
};

export const handler = async () => {
  try {
    const chains = getChains();
    const { chain }: { chain: "add-new-chain" | string } =
      await inquirer.prompt([
        {
          message: "Select a chain",
          name: "chain",
          type: "list",
          choices: [
            ...chains.map((chain) => ({
              name: chain.name + chalk.gray(` - ${chain.network}`),
              short: chain.network,
              value: chain.network,
            })),
            ...(chains.length > 0 ? [{ type: "separator" }] : []),
            {
              name: chalk.greenBright("+") + " Add new chain",
              short: "Add new chain",
              value: "add-new-chain",
            },
          ],
          required: true,
        },
      ]);
    if (chain === "add-new-chain") {
      await promptAddNewChain();
    } else {
      const selectedChain = chains.find((c) => c.network === chain)!;
      await promptAskChainAction(selectedChain);
    }
  } catch (error) {
    Logger.error("There was an error while configuring chains:");
    Logger.error(error);
  }
};

Program.command("chains")
  .description("Add or edit available CLI chains")
  .action(handler);
