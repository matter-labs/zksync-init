import { readFileSync } from "fs";

import { fileOrDirExists, getLocalPath, writeFile } from "../utils/files.js";
import Logger from "../utils/logger.js";

class ConfigHandlerClass {
  private configPath = getLocalPath("config.json");
  private internalConfig: Record<string, unknown> = {};

  constructor() {
    this.loadConfig();
  }

  private loadConfig() {
    if (this.configExists) {
      try {
        this.internalConfig = JSON.parse(
          readFileSync(this.configPath, "utf-8")
        );
      } catch (error) {
        Logger.error(`Error while reading config file: ${error}`);
      }
    }
  }

  private saveConfig() {
    writeFile(this.configPath, JSON.stringify(this.internalConfig, null, 2));
    Logger.debug(`Saved config to ${this.configPath}`);
  }

  private get configExists() {
    return fileOrDirExists(this.configPath);
  }

  private accessNestedProperty(
    path: string,
    createIfNotExist: boolean = false
  ) {
    const keys = path.split(".");
    let current = this.internalConfig;
    for (let i = 0; i < keys.length - 1; i++) {
      if (current[keys[i]] === undefined) {
        if (createIfNotExist) {
          current[keys[i]] = {};
        } else {
          return undefined;
        }
      }
      current = current[keys[i]] as Record<string, unknown>;
    }
    return { parent: current, lastKey: keys[keys.length - 1] };
  }

  getConfigValue<T>(path: string): T | undefined {
    const result = this.accessNestedProperty(path);
    return result ? (result.parent[result.lastKey] as T) : undefined;
  }

  setConfigValue(path: string, value: unknown) {
    const result = this.accessNestedProperty(path, true);
    if (result) {
      result.parent[result.lastKey] = value;
      this.saveConfig();
    }
  }
}

export const configHandler = new ConfigHandlerClass();

export type ConfigHandler = typeof configHandler;
