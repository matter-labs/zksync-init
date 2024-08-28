import chalk from "chalk";

import Logger from "../../../utils/logger.js";
import Program from "../command.js";
import { modulesConfigHandler } from "../ModulesConfigHandler.js";

export const handler = async () => {
  try {
    const modules = await modulesConfigHandler.getAllModules();
    if (!modules.length) {
      Logger.warn("There are no modules installed");
      Logger.info(
        "You can install modules with: `npx zksync-cli dev install [module-name...]"
      );
      return;
    }

    Logger.info("Installed modules:");
    for (const module of modules) {
      let logStr = `"${module.name}"`;
      const moduleVersion = module.version;
      if (moduleVersion) {
        logStr += ` ${moduleVersion}`;
      }
      logStr += chalk.blueBright(
        ` - ${module.package.name}${chalk.gray("@" + module.package.version)}`
      );
      if (module.package.symlinked) {
        logStr += chalk.blueBright(" (installed via --link)");
      }
      Logger.info(logStr, { noFormat: true });
    }
  } catch (error) {
    Logger.error("There was an error displaying installed modules:");
    Logger.error(error);
  }
};

Program.command("modules")
  .description("List currently installed modules")
  .action(handler);
