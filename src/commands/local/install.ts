import chalk from "chalk";
import { Option } from "commander";

import Program from "./command.js";
import { modulesPath } from "./modules/Module.js";
import { track } from "../../utils/analytics.js";
import { executeCommand } from "../../utils/helpers.js";
import Logger from "../../utils/logger.js";

const linkOption = new Option("--link", "Use `npm link` instead of `npm install` (useful during module development)");

export const handler = async (moduleNames: string[], options: { link: boolean }) => {
  try {
    const command = options.link ? "npm link" : "npm install";
    const fullCommand = `${command}${moduleNames.length ? ` ${moduleNames.join(" ")}` : ""}`;
    await executeCommand(fullCommand, { cwd: modulesPath });

    if (moduleNames.length) {
      Logger.info(
        `Add module${moduleNames.length > 1 ? "s" : ""} to your configuration with \`${chalk.magentaBright(
          "zksync-cli local config"
        )}\``
      );
    }
  } catch (error) {
    Logger.error("There was an error while installing module:");
    Logger.error(error);
    track("error", { error });
  }
};

Program.command("install")
  .alias("i")
  .argument("[module...]", "NPM package name of the module to install")
  .description("Install module with NPM")
  .addOption(linkOption)
  .action(handler);
