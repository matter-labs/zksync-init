import fs from "fs";
import path from "path";

import { fileOrDirExists, writeFile } from "../../../../utils/files.js";
import Logger from "../../../../utils/logger.js";
import { modulesPath } from "../Module.js";

import type Module from "../Module.js";

type ModuleUpdatesInfo = {
  [key: string]: {
    current?: string;
    latest?: string;
    lastUpdateCheck: string;
  };
};

const moduleUpdatesInfoPath = path.join(modulesPath, "updates.json");

const getModuleUpdatesInfo = async (): Promise<ModuleUpdatesInfo> => {
  if (!fileOrDirExists(moduleUpdatesInfoPath)) return {};

  try {
    const content = fs.readFileSync(moduleUpdatesInfoPath, "utf-8");
    return JSON.parse(content);
  } catch (error) {
    Logger.error(`Error parsing module updates info: ${error}`);
    throw error;
  }
};

const checkModulesForUpdates = async (
  modules: Module[]
): Promise<ModuleUpdatesInfo> => {
  const moduleUpdatesInfo = await getModuleUpdatesInfo();
  let hadChanges = false;

  await Promise.all(
    modules.map(async (module) => {
      const moduleInfo = moduleUpdatesInfo[module.package.name];
      if (moduleInfo) {
        const hoursSinceLastUpdate =
          (new Date().getTime() -
            new Date(moduleInfo.lastUpdateCheck).getTime()) /
          (1000 * 3600);
        if (hoursSinceLastUpdate < 1) return;
      }

      try {
        const currentVersion = module.version;
        const latestVersion = await module.getLatestVersion();
        if (
          latestVersion &&
          (latestVersion !== currentVersion ||
            !moduleInfo ||
            moduleInfo.latest !== latestVersion ||
            moduleInfo.current !== currentVersion)
        ) {
          moduleUpdatesInfo[module.package.name] = {
            current: currentVersion,
            latest: latestVersion,
            lastUpdateCheck: new Date().toISOString(),
          };
          hadChanges = true;
        }
      } catch (error) {
        Logger.error(
          `There was an error while checking for updates for module "${module.name}":`
        );
        Logger.error(error);
      }
    })
  );

  if (hadChanges) {
    writeFile(
      moduleUpdatesInfoPath,
      JSON.stringify(moduleUpdatesInfo, null, 2)
    );
  }

  return moduleUpdatesInfo;
};

export const getModulesRequiringUpdates = async (modules: Module[]) => {
  const installedModules = await Promise.all(
    modules.filter((module) => module.isInstalled())
  );
  const updateInfo = await checkModulesForUpdates(installedModules);

  return installedModules
    .map((module) => ({
      module,
      currentVersion: module.version,
      latestVersion: updateInfo[module.package.name]?.latest,
      requiresUpdate:
        module.version !== updateInfo[module.package.name]?.latest,
    }))
    .filter((e) => e.requiresUpdate);
};
