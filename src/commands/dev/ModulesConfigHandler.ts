import { configHandler } from "../../common/ConfigHandler.js";
import { getChains } from "../config/chains.js";
import { ModuleCategory } from "./modules/Module.js";
import { getModulePackages } from "./modules/utils/packages.js";

import type { ModuleNode, NodeInfo } from "./modules/Module.js";
import type Module from "./modules/Module.js";

class ConfigHandlerClass {
  /* Returns all installed modules */
  async getAllModules() {
    const installedModules = await getModulePackages();
    return installedModules.map((modulePackage) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const module = modulePackage.module as any;
      const newModule: Module = new module(this);
      newModule.package = {
        name: modulePackage.name,
        version: modulePackage.version,
        symlinked: modulePackage.symlinked ?? false,
      };
      return newModule;
    });
  }
  /* Returns modules selected in the config */
  async getConfigModules() {
    const selectedModules =
      configHandler.getConfigValue<string[]>("modules") || [];
    return (await this.getAllModules()).filter((module) =>
      selectedModules.includes(module.package.name)
    );
  }
  async setConfigModules(modules: string[]) {
    configHandler.setConfigValue("modules", modules);
  }
  async setCustomChain(chainKey?: string) {
    configHandler.setConfigValue("chainAsNode", chainKey);
  }
  async getNodeInfo(): Promise<NodeInfo> {
    const chainKey = configHandler.getConfigValue<string>("chainAsNode");
    if (chainKey) {
      const chains = getChains();
      const chain = chains.find((chain) => chain.network === chainKey);
      if (!chain) {
        throw new Error(`Chain "${chainKey}" was not found in the config`);
      }
      return chain;
    }
    const modules = await this.getConfigModules();
    const node = modules.find(
      (module) => module.category === ModuleCategory.Node
    );
    if (!node) {
      throw new Error("No node module found");
    }
    return (node as ModuleNode).nodeInfo;
  }
}

export const modulesConfigHandler = new ConfigHandlerClass();
export type ConfigHandler = typeof modulesConfigHandler;
