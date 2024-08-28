import { readFileSync } from "fs";
import path from "path";
import chalk from "chalk";
import updateNotifier from "update-notifier";

import { getDirPath } from "./files.js";

import type { Options as BoxenOptions } from "boxen";

export const Package: {
  name: string;
  description: string;
  version: string;
} = JSON.parse(
  readFileSync(
    path.join(getDirPath(import.meta.url), "../../package.json"),
    "utf-8"
  )
);

export const checkForUpdates = async () => {
  if (Package.version === "0.0.0-development") return;

  const notifier = updateNotifier({
    pkg: Package,
    shouldNotifyInNpmScript: true, // Make notification work when using with NPX
    updateCheckInterval: 1000 * 60 * 60 * 12, // 12 hours
  });
  let message = "";
  message += "zksync-cli has an update available";
  message += ` ${chalk.dim(notifier.update?.current)} → ${chalk.green(notifier.update?.latest)}`;
  message += `\nRun ${chalk.blueBright("{updateCommand}")} to update`;

  const boxenOptions: BoxenOptions = {
    padding: 1,
    margin: 1,
    textAlignment: "center",
    borderColor: "yellow",
    borderStyle: "round",
  };

  notifier.notify({ message, boxenOptions, isGlobal: true });
};
