import chalk from "chalk";
import inquirer from "inquirer";

import { formatSeparator } from "../../utils/formatters.js";
import Logger from "../../utils/logger.js";
import { getChains, promptAddNewChain } from "../config/chains.js";
import Program from "./command.js";
import { ModuleCategory } from "./modules/Module.js";
import { modulesConfigHandler } from "./ModulesConfigHandler.js";

import type { L2Chain } from "../../data/chains.js";
import type Module from "./modules/Module.js";
import type { ModuleNode, NodeInfo } from "./modules/Module.js";

type LocalConfigOptions = {
  node?: string;
  modules?: string[];
};

const formatModuleName = (module: Module) => {
  let name = `${module.name} - ${module.description}`;
  name += chalk.gray(` - ${module.package.name}`);
  if (module.package.symlinked) {
    name += chalk.gray(" (installed via --link)");
  }
  return name;
};

export const setupConfig = async (options: LocalConfigOptions = {}) => {
  const modules = await modulesConfigHandler.getAllModules();
  if (!modules.length) {
    Logger.error("No installed modules were found");
    Logger.error(
      "Run `npx zksync-cli dev install [module-name...]` to install modules."
    );
    return;
  }

  const nodes = modules.filter(
    (module) => module.category === ModuleCategory.Node
  );
  const chains = getChains();

  const nodeAnswers: LocalConfigOptions = await inquirer.prompt(
    [
      {
        message: "Node to use",
        name: "node",
        type: "list",
        when: () => nodes.length > 0,
        choices: [
          ...nodes.map((node) => ({
            name: formatModuleName(node),
            short: node.name,
            value: node.package.name,
          })),
          ...(chains.length > 0 ? [formatSeparator("Custom chains")] : []),
          ...chains.map((chain) => ({
            name: chain.name + chalk.gray(` - ${chain.network}`),
            short: chain.network,
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

  options = {
    ...options,
    ...nodeAnswers,
  };

  let chain: L2Chain | undefined;
  if (nodeAnswers.node === "add-new-chain") {
    chain = await promptAddNewChain();
    options.node = chain.network;
  } else {
    chain = chains.find((chain) => chain.network === nodeAnswers.node);
  }

  let nodeInfo: NodeInfo;
  let selectedNode: ModuleNode | undefined;
  if (chain) {
    nodeInfo = chain;
    modulesConfigHandler.setCustomChain(chain.network);
  } else {
    selectedNode = modules.find(
      (module) => module.package.name === options.node
    )! as ModuleNode;
    nodeInfo = selectedNode.nodeInfo;
    modulesConfigHandler.setCustomChain(undefined);
  }

  const potentialModules = modules.filter(
    (module) => module.category !== ModuleCategory.Node
  );
  const modulesWithSupportInfo = await Promise.all(
    potentialModules.map(async (module) => {
      try {
        return {
          instance: module,
          unsupported: (await module.isNodeSupported(nodeInfo))
            ? false
            : "Module doesn't support selected node",
        };
      } catch {
        return {
          instance: module,
          unsupported: "Failed to check node support status",
        };
      }
    })
  );
  const sortedModules = modulesWithSupportInfo.sort((a, b) => {
    // Move unsupported modules to the bottom.
    if (Boolean(a.unsupported) !== Boolean(b.unsupported)) {
      return a.unsupported ? 1 : -1;
    }
    // If categories are equal, compare by name.
    if (a.instance.category === b.instance.category) {
      return a.instance.name.localeCompare(b.instance.name);
    }
    // Compare by category.
    return a.instance.category.localeCompare(b.instance.category);
  });

  const modulesAnswers: LocalConfigOptions = await inquirer.prompt(
    [
      {
        message: "Additional modules to use",
        name: "modules",
        type: "checkbox",
        when: () => sortedModules.length > 0,
        choices: sortedModules.map((module) => ({
          name: formatModuleName(module.instance),
          short: module.instance.name,
          value: module.instance.package.name,
          disabled: module.unsupported,
        })),
      },
    ],
    options
  );

  options = {
    modules: [],
    ...options,
    ...modulesAnswers,
  };

  Logger.debug(`Final dev config options: ${JSON.stringify(options, null, 2)}`);

  Logger.debug("Saving configuration to dev config file...");

  const selectedAdditionalModules = options.modules!.map(
    (module) => modules.find((m) => m.package.name === module)!
  );

  modulesConfigHandler.setConfigModules([
    ...(selectedNode ? [selectedNode.package.name] : []),
    ...selectedAdditionalModules.map((module) => module.package.name),
  ]);
};

export const handler = async (options: LocalConfigOptions = {}) => {
  try {
    Logger.debug(
      `Initial dev config options: ${JSON.stringify(options, null, 2)}`
    );

    await setupConfig(options);

    Logger.info("\nConfiguration saved successfully!", { noFormat: true });
    Logger.info(
      `Start configured environment with \`${chalk.magentaBright("npx zksync-cli dev start")}\``
    );
  } catch (error) {
    Logger.error(
      "There was an error while configuring the testing environment:"
    );
    Logger.error(error);
  }
};

Program.command("config")
  .description("Select modules to run in local development environment")
  .action(handler);
