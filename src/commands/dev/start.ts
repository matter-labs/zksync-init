import chalk from "chalk";
import ora from "ora";

import { formatLogs } from "../../utils/formatters.js";
import Logger from "../../utils/logger.js";
import Program from "./command.js";
import { setupConfig } from "./config.js";
import { ModuleCategory } from "./modules/Module.js";
import { getModulesRequiringUpdates } from "./modules/utils/updates.js";
import { modulesConfigHandler } from "./ModulesConfigHandler.js";

import type Module from "./modules/Module.js";

const installModules = async (modules: Module[]) => {
  for (const module of modules) {
    if (await module.isInstalled()) {
      Logger.debug(`Module "${module.name}" is already installed. Skipping...`);
      continue;
    }
    Logger.info(`\nInstalling "${module.name}"...`);
    await module.install();
  }
};

const waitForCustomChainStart = async () => {
  const nodeInfo = await modulesConfigHandler.getNodeInfo();
  const retryTime = 1000;
  let tries = 0;
  const maxTries = 20;
  const spinner = ora().start();
  const updateSpinner = () => {
    if (!spinner.isSpinning) return;
    spinner.text = `Waiting for "${nodeInfo.name}" to come alive... ${chalk.gray(`${tries}/${maxTries} tries`)}`;
  };
  return new Promise<void>((resolve, reject) => {
    const interval = setInterval(async () => {
      try {
        if (tries >= maxTries) {
          clearInterval(interval);
          spinner.fail(
            `Can't connect to "${nodeInfo.name}" ${chalk.gray(`(${nodeInfo.rpcUrl})`)}. Please make sure it is running.`
          );
          reject("Selected chain isn't running!");
          return;
        }
        tries++;
        updateSpinner();
        const response = await fetch(`${nodeInfo.rpcUrl}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "eth_blockNumber",
            params: [],
            id: tries,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.result) {
            clearInterval(interval);
            spinner.succeed(`"${nodeInfo.name}" is alive!`);
            resolve();
          } else {
            Logger.debug(
              "Received unexpected data from eth_blockNumber:",
              data
            );
          }
        } else {
          updateSpinner();
        }
      } catch (error) {
        updateSpinner();
        Logger.debug("\nError while fetching eth_blockNumber:");
        Logger.debug(error);
      }
    }, retryTime);
  });
};

const startModules = async (modules: Module[]) => {
  if (!modules.some((e) => e.category === ModuleCategory.Node)) {
    await waitForCustomChainStart();
  }
  Logger.info(`\nStarting: ${modules.map((m) => m.name).join(", ")}...`);
  await Promise.all(modules.map((m) => m.start()));
};

const stopOtherNodes = async (currentModules: Module[]) => {
  const modules = await modulesConfigHandler.getAllModules();
  const currentNodeKeys = currentModules
    .filter((e) => e.category === ModuleCategory.Node)
    .map((m) => m.package.name);

  for (const module of modules) {
    if (
      module.category === ModuleCategory.Node &&
      !currentNodeKeys.includes(module.package.name) &&
      (await module.isInstalled()) &&
      (await module.isRunning())
    ) {
      Logger.info(`Stopping conflicting node "${module.name}"...`);
      await module.stop();
    }
  }
};

const checkForUpdates = async (modules: Module[]) => {
  const modulesRequiringUpdates = await getModulesRequiringUpdates(modules);
  if (!modulesRequiringUpdates.length) {
    return;
  }

  Logger.info(chalk.yellow("\nModule updates available:"));
  for (const {
    module,
    currentVersion,
    latestVersion,
  } of modulesRequiringUpdates) {
    let str = `${module.name}: ${latestVersion}`;
    if (currentVersion) {
      str += chalk.gray(` (current: ${currentVersion})`);
    }
    str += chalk.gray(` - npx zksync-cli dev update ${module.package.name}`);
    Logger.info(str);
  }
  if (modulesRequiringUpdates.length > 1) {
    Logger.info(
      chalk.gray(
        `Update all modules: npx zksync-cli dev update ${modulesRequiringUpdates
          .map(({ module }) => module.package.name)
          .join(" ")}`
      )
    );
  }
};

const showStartupInfo = async (modules: Module[]) => {
  for (const module of modules) {
    Logger.info("");
    const startupInfo = await module.getStartupInfo();
    let startedStr = chalk.magentaBright(`${module.name} started`);
    const moduleVersion = module.version;
    if (moduleVersion) {
      startedStr += chalk.gray(` ${moduleVersion}`);
    }
    if (!startupInfo.length) {
      Logger.info(`${startedStr}`);
      continue;
    }

    Logger.info(`${startedStr}:`);
    Logger.info(formatLogs(startupInfo, " "));
  }
};

export const handler = async () => {
  try {
    if (!(await modulesConfigHandler.getConfigModules()).length) {
      await setupConfig();
      Logger.info(
        `You can change the config later with ${chalk.blueBright("`npx zksync-cli dev config`")}\n`,
        {
          noFormat: true,
        }
      );
    }

    const modules = await modulesConfigHandler.getConfigModules();
    if (!modules.length) {
      Logger.warn("Config does not contain any installed modules.");
      Logger.warn(
        "Run `npx zksync-cli dev config` to select which modules to use."
      );
      return;
    }

    const sortedModules = [
      ...modules.filter((e) => !e.startAfterNode),
      ...modules.filter((e) => e.startAfterNode),
    ];
    await installModules(sortedModules);
    await stopOtherNodes(sortedModules);
    await startModules(sortedModules);
    await checkForUpdates(sortedModules);
    await showStartupInfo(sortedModules);
  } catch (error) {
    Logger.error("There was an error while starting the testing environment:");
    Logger.error(error);
    throw error;
  }
};

Program.command("start")
  .description("Start local ZKsync environment and modules")
  .action(handler);
