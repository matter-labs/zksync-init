import { Option } from "commander";

import { executeCommand } from "../../utils/helpers.js";
import Logger from "../../utils/logger.js";
import { cleanModule } from "./clean.js";
import Program from "./command.js";
import { createModulesFolder, modulesPath } from "./modules/Module.js";
import { findDefaultModules } from "./modules/utils/packages.js";
import { modulesConfigHandler } from "./ModulesConfigHandler.js";

const unlinkOption = new Option(
  "--unlink",
  "Use `npm unlink` instead of `npm uninstall` (useful during module development)"
);

export const handler = async (
  moduleNames: string[],
  options: { unlink: boolean }
) => {
  try {
    if (!options.unlink) {
      const defaultModules = await findDefaultModules();
      for (const name of moduleNames) {
        if (defaultModules.some((e) => e.name === name)) {
          Logger.error(`Uninstalling default modules is not allowed: ${name}`);
          return;
        }
      }
    }

    const modules = await modulesConfigHandler.getAllModules();
    await Promise.all(
      modules
        .filter((e) => moduleNames.includes(e.package.name))
        .map((module) => cleanModule(module))
    );

    createModulesFolder();

    const command = options.unlink ? "npm unlink" : "npm uninstall";
    const fullCommand = `${command}${moduleNames.length ? ` ${moduleNames.join(" ")}` : ""}`;

    await executeCommand(fullCommand, { cwd: modulesPath });
  } catch (error) {
    Logger.error("There was an error while uninstalling module:");
    Logger.error(error);
  }
};

Program.command("uninstall")
  .description("Uninstall module with NPM")
  .argument("<module...>", "NPM package name of the module to uninstall")
  .addOption(unlinkOption)
  .action(handler);
