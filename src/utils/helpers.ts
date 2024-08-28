import { spawn } from "child_process";
import chalk from "chalk";
import { ethers } from "ethers";
import { computeAddress } from "ethers/lib/utils.js";
import { Provider, Wallet } from "zksync-ethers";

import { Logger } from "../lib/index.js";

import type { Command } from "commander";

export const optionNameToParam = (input: string): string => {
  // "--l1-rpc-url" => "l1RpcUrl"
  const parts = input.replace(/^--/, "").split("-");

  for (let i = 1; i < parts.length; i++) {
    parts[i] = parts[i].charAt(0).toUpperCase() + parts[i].slice(1);
  }

  return parts.join("");
};

export const getAddressFromPrivateKey = (privateKey: string): string => {
  return computeAddress(
    privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`
  );
};

export const getL1Provider = (l1RpcUrl: string) => {
  return new ethers.providers.JsonRpcProvider(l1RpcUrl);
};
export const getL2Provider = (rpc: string) => {
  return new Provider(rpc);
};

export const getL2Wallet = (
  privateKey: string,
  l2Provider: Provider,
  l1Provider?: ethers.providers.Provider
) => {
  return new Wallet(privateKey, l2Provider, l1Provider);
};

export interface ExecuteOptions {
  silent?: boolean;
  cwd?: string;
}
export const executeCommand = (
  command: string,
  options: ExecuteOptions = {}
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const [cmd, ...args] = command.split(" ");

    const child = spawn(
      cmd === "npm" ? (/^win/.test(process.platform) ? "npm.cmd" : "npm") : cmd,
      args,
      {
        stdio: options.silent ? "pipe" : "inherit",
        cwd: options.cwd,
      }
    );
    let output = "";
    let errorOutput = "";

    if (options.silent) {
      child.stdout!.on("data", (data) => {
        if (!options.silent) {
          process.stdout.write(data);
        }
        output += data.toString();
      });

      child.stderr!.on("data", (data) => {
        if (!options.silent) {
          process.stderr.write(data);
        }
        errorOutput += data.toString();
      });
    }

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Command exited with code ${code}: ${errorOutput}`));
      } else {
        resolve(output);
      }
    });

    child.on("error", (error) => {
      reject(error);
    });
  });
};

export const hasColor = (text: string): boolean => {
  // eslint-disable-next-line no-control-regex
  const colorEscapeCodePattern = /\x1B\[\d+m/g;
  return colorEscapeCodePattern.test(text);
};

const findFullCommandName = (cmd: Command): string => {
  let command = "";
  const findCommandBase = (cmd: Command) => {
    const commandName = (cmd as unknown as { _name?: string })["_name"];
    if (commandName) {
      command = command ? `${commandName} ${command}` : commandName;

      if (cmd.parent) {
        findCommandBase(cmd.parent);
      }
    }
  };
  findCommandBase(cmd);
  return command;
};

export const logFullCommandFromOptions = (
  options: Record<string, unknown>,
  context: Command,
  formattingOptions?: { emptyLine?: boolean }
) => {
  let command = findFullCommandName(context);
  let comparisonCommand = command; // Unescaped command string for comparison purposes

  context.options.forEach((option) => {
    const optionParamName = optionNameToParam(option.long!);
    if (!(optionParamName in options)) return;
    if (optionParamName === "privateKey") return;

    const value = options[optionParamName];
    if (Array.isArray(value) && !value.length) return;

    const optionPart = ` ${option.short || option.long}`;
    if (typeof value === "boolean") {
      command += optionPart;
      comparisonCommand += optionPart;
    } else if (Array.isArray(value)) {
      const escapedValue = value.map((v) => `"${v}"`).join(" ");
      const unescapedValue = value.join(" ");
      command += `${optionPart} ${escapedValue}`;
      comparisonCommand += `${optionPart} ${unescapedValue}`;
    } else {
      command += `${optionPart} "${value}"`;
      comparisonCommand += `${optionPart} ${value}`;
    }
  });

  if (!process.argv.join(" ").endsWith(comparisonCommand)) {
    if (formattingOptions?.emptyLine) {
      Logger.info("");
    }
    Logger.info(chalk.gray(`Run this directly: npx ${command}`));
  }
};
