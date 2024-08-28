import Logger from "../../utils/logger.js";
import Program from "./command.js";
import { modulesConfigHandler } from "./ModulesConfigHandler.js";

export const handler = async (modulePackageNames: string[]) => {
  try {
    const modules = [];
    if (modulePackageNames.length) {
      const allModules = await modulesConfigHandler.getAllModules();
      for (const moduleName of modulePackageNames) {
        const module = allModules.find((m) => m.package.name === moduleName);
        if (!module) {
          throw new Error(`Module "${moduleName}" not found`);
        }
        modules.push(module);
      }
    } else {
      const configModules = await modulesConfigHandler.getConfigModules();
      modules.push(...configModules);
    }
    Logger.info(`Stopping: ${modules.map((m) => m.name).join(", ")}...`);
    await Promise.all(
      modules.map((m) =>
        m.isInstalled().then((installed) => (installed ? m.stop() : undefined))
      )
    );
  } catch (error) {
    Logger.error("There was an error while stopping the testing environment:");
    Logger.error(error);
  }
};

Program.command("stop")
  .description("Stop local ZKsync environment and modules")
  .argument("[module...]", "NPM package names of the modules to stop")
  .action(handler);
