import Logger from "../../utils/logger.js";
import Program from "./command.js";
import { handler as start } from "./start.js";
import { handler as stop } from "./stop.js";

export const handler = async (modulePackageNames: string[]) => {
  try {
    await stop(modulePackageNames);
    await start();
  } catch (error) {
    Logger.error(
      "There was an error while restarting the testing environment:"
    );
    Logger.error(error);
  }
};

Program.command("restart")
  .description("Restart local ZKsync environment and modules")
  .argument("[module...]", "NPM package names of the modules to restart")
  .action(handler);
