import chalk from "chalk";
import { Option } from "commander";

import { executeCommand } from "../../utils/helpers.js";
import Logger from "../../utils/logger.js";
import Program from "./command.js";
import { createModulesFolder, modulesPath } from "./modules/Module.js";
import { modulesConfigHandler } from "./ModulesConfigHandler.js";

const packageOption = new Option(
  "--package",
  "Update NPM package instead of module"
);
const forceOption = new Option(
  "--force",
  "Force update module (skip version check)"
);

type ModuleUpdateOptions = {
  force?: boolean;
  package?: boolean;
};

export const handler = async (
  moduleNames: string[],
  options: ModuleUpdateOptions = {}
) => {
  try {
    if (options.package) {
      createModulesFolder();

      Logger.info(`Updating NPM packages: ${moduleNames.join(", ")}`);
      const fullCommand = `npm update${moduleNames.length ? ` ${moduleNames.join(" ")}` : ""}`;

      await executeCommand(fullCommand, { cwd: modulesPath });
    } else {
      if (moduleNames.length > 1) {
        Logger.info(`Modules to update: ${moduleNames.join(", ")}`);
      }
      const modules = await modulesConfigHandler.getAllModules();
      for (const moduleName of moduleNames) {
        Logger.info("");
        const module = modules.find(
          (module) => module.package.name === moduleName
        );
        if (!module) {
          Logger.error(`Module "${moduleName}" is not installed`);
          continue;
        }

        try {
          const currentVersion = module.version;
          const latestVersion = await module.getLatestVersion();

          if (!options.force) {
            if (currentVersion === latestVersion) {
              Logger.warn(`Module "${moduleName}" is already up to date`);
              continue;
            }
          }
          if (!latestVersion) {
            Logger.error(
              `Latest version wasn't found for module "${moduleName}"`
            );
            continue;
          }

          Logger.info(
            `Updating module "${moduleName}"${currentVersion && " from " + currentVersion} to ${latestVersion}`
          );
          await module.update();
        } catch (error) {
          Logger.error(
            `There was an error while updating module "${moduleName}":`
          );
          Logger.error(error);
          continue;
        }
      }
    }

    Logger.info(
      `\nTo make sure changes are applied use: \`${chalk.magentaBright("npx zksync-cli dev start")}\``
    );
  } catch (error) {
    Logger.error("There was an error while updating module:");
    Logger.error(error);
  }
};

Program.command("update")
  .description("Update module version")
  .argument("<module...>", "NPM package name of the module to update")
  .addOption(forceOption)
  .addOption(packageOption)
  .action(handler);
