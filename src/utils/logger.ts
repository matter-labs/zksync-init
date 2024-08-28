import chalk from "chalk";
import { createLogger, format, transports } from "winston";

import { hasColor } from "./helpers.js";

import type { Chalk } from "chalk";

export const errorSymbol = "ⓘ";
export const warningSymbol = "⚠";

const logLevelFormatter: Record<string, Chalk | ((msg: string) => string)> = {
  error: (msg: string) => chalk.redBright(`${errorSymbol} ${msg}`),
  warn: (msg: string) => chalk.yellowBright(`${warningSymbol} ${msg}`),
  info: chalk.magentaBright,
  debug: chalk.gray,
};

const styleLogs = format.printf((info) => {
  if (hasColor(info.message) || info.noFormat) {
    return info.message;
  }

  const colorize = logLevelFormatter[info.level];
  return colorize ? colorize(info.message) : info.message;
});

const logger = createLogger({
  level: process.env.NODE_ENV === "development" ? "debug" : "info",
  format: format.combine(styleLogs),
  transports: [new transports.Console()],
});

export default logger;
