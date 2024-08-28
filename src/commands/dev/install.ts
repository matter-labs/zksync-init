import chalk from "chalk";
import { Option } from "commander";

import { executeCommand } from "../../utils/helpers.js";
import Logger from "../../utils/logger.js";
import Program from "./command.js";
import { createModulesFolder, modulesPath } from "./modules/Module.js";

const linkOption = new Option(
  "--link",
  "Use `npm link` instead of `npm install` (useful during module development)"
);

export const handler = async (
  moduleNames: string[],
  options: { link: boolean }
) => {
  try {
    createModulesFolder();

    const command = options.link ? "npm link" : "npm install";
    const fullCommand = `${command}${moduleNames.length ? ` ${moduleNames.join(" ")}` : ""}`;
    await executeCommand(fullCommand, { cwd: modulesPath });

    if (moduleNames.length) {
      Logger.info(
        `\nAdd module${moduleNames.length > 1 ? "s" : ""} to your configuration with \`${chalk.magentaBright(
          "npx zksync-cli dev config"
        )}\``
      );
    }
  } catch (error) {
    Logger.error("There was an error while installing module:");
    Logger.error(error);
  }
};

Program.command("install")
  .alias("i")
  .description("Install module with NPM")
  .argument("<module...>", "NPM package name of the module to install")
  .addOption(linkOption)
  .action(handler);
