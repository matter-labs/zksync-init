import { Command } from "commander";
import { compare } from "compare-versions";

import Logger from "./utils/logger.js";
import { getNodeVersion } from "./utils/node.js";
import { checkForUpdates, Package } from "./utils/package.js";

const program = new Command();
program
  .name(Package.name)
  .description(Package.description)
  .version(Package.version)
  .showHelpAfterError();
program.hook("preAction", async () => {
  const nodeVersion = await getNodeVersion();
  const minimumNodeVersion = "18.0.0";
  try {
    if (compare(nodeVersion, minimumNodeVersion, "<")) {
      Logger.error("Minimum Node.js version required: v18.x");
      Logger.error(`Current version: v${nodeVersion}`);
      process.exit(1);
    }
  } catch {
    Logger.warn(
      `Failed to check Node.js version. Make sure you are using version ${minimumNodeVersion} or higher`
    );
  }

  await checkForUpdates();
});

export default program;
