import fs from "fs";
import { createRequire } from "module";
import path from "path";
import ModuleBlockExplorer from "zkcli-block-explorer";
import ModuleDockerizedNode from "zkcli-dockerized-node";
import ModuleInMemoryNode from "zkcli-in-memory-node";
import ModulePortal from "zkcli-portal";

import { fileOrDirExists } from "../../../../utils/files.js";
import Logger from "../../../../utils/logger.js";
import { modulesPath } from "../Module.js";

import type Module from "../Module.js";

type Package = {
  module: Module;
  name: string;
  version: string;
  symlinked?: boolean;
};

const requireModule = async (modulePath: string): Promise<Module> => {
  if (!fileOrDirExists(modulePath)) {
    throw new Error(`Module at "${modulePath}" was not found`);
  }
  const module = await import(modulePath);
  return module.default;
};

const getPackageByPath = async (modulePath: string): Promise<Package> => {
  const modulePackagePath = path.join(modulePath, "package.json");
  const packageContent = fs.readFileSync(modulePackagePath, "utf-8");
  const { name, version, main }: Package & { main: string } =
    JSON.parse(packageContent);
  return {
    module: await requireModule(path.join(modulePath, main)),
    name,
    version,
  };
};

// when using `npm link` modules are not added to package.json but are symlinked in node_modules
const findLinkedModules = async (): Promise<Package[]> => {
  const packages: Package[] = [];

  const nodeModulesPath = path.join(modulesPath, "node_modules");
  if (!fileOrDirExists(nodeModulesPath)) {
    return [];
  }

  const folders = fs.readdirSync(nodeModulesPath);

  for (const folder of folders) {
    const modulePath = path.join(nodeModulesPath, folder);
    if (fs.lstatSync(modulePath).isSymbolicLink()) {
      try {
        const modulePackage = await getPackageByPath(modulePath);
        packages.push({
          ...modulePackage,
          symlinked: true,
        });
      } catch (error) {
        Logger.error(`There was an error parsing linked module "${folder}"`);
        Logger.error(error);
      }
    }
  }
  return packages;
};

const findInstalledModules = async (): Promise<Package[]> => {
  const modulePackagePath = path.join(modulesPath, "package.json");

  if (!fileOrDirExists(modulePackagePath)) {
    return [];
  }

  const packageContent = fs.readFileSync(modulePackagePath, "utf-8");
  const modulesPackage: {
    dependencies?: Record<Package["name"], Package["version"]>;
  } = JSON.parse(packageContent);
  if (!modulesPackage.dependencies) {
    return [];
  }
  return (
    await Promise.all(
      Object.entries(modulesPackage.dependencies).map(async ([name]) => {
        try {
          const modulePath = path.join(modulesPath, "node_modules", name);
          const modulePackage = await getPackageByPath(modulePath);
          return modulePackage;
        } catch (error) {
          Logger.error(`There was an error parsing installed module "${name}"`);
          Logger.error(error);
          return null;
        }
      })
    )
  ).filter((e) => !!e) as Package[];
};

export const findDefaultModules = async (): Promise<Package[]> => {
  type PackageJSON = { name: string; version: string };
  const require = createRequire(import.meta.url);
  const packages = {
    "zkcli-in-memory-node":
      require("zkcli-in-memory-node/package.json") as PackageJSON,
    "zkcli-dockerized-node":
      require("zkcli-dockerized-node/package.json") as PackageJSON,
    "zkcli-block-explorer":
      require("zkcli-block-explorer/package.json") as PackageJSON,
    "zkcli-portal": require("zkcli-portal/package.json") as PackageJSON,
  } as const;

  return [
    {
      module: ModuleInMemoryNode as unknown as Module,
      name: packages["zkcli-in-memory-node"].name,
      version: packages["zkcli-in-memory-node"].version,
    },
    {
      module: ModuleDockerizedNode as unknown as Module,
      name: packages["zkcli-dockerized-node"].name,
      version: packages["zkcli-dockerized-node"].version,
    },
    {
      module: ModuleBlockExplorer as unknown as Module,
      name: packages["zkcli-block-explorer"].name,
      version: packages["zkcli-block-explorer"].version,
    },
    {
      module: ModulePortal as unknown as Module,
      name: packages["zkcli-portal"].name,
      version: packages["zkcli-portal"].version,
    },
  ];
};

export const getModulePackages = async (): Promise<Package[]> => {
  try {
    const installedModules = await findInstalledModules();
    const linkedModules = await findLinkedModules();
    const defaultModules = await findDefaultModules();

    return [...defaultModules, ...installedModules, ...linkedModules];
  } catch (error) {
    Logger.error("There was an error parsing modules");
    throw error;
  }
};
