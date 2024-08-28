import chalk from "chalk";
import { ethers } from "ethers";
import inquirer from "inquirer";

import {
  logFullCommandFromOptions,
  optionNameToParam,
} from "../../utils/helpers.js";
import Logger from "../../utils/logger.js";
import Program from "./command.js";
import { abiOption, argumentsOption, methodOption } from "./common/options.js";
import {
  encodeData,
  formatArgs,
  getFragmentFromSignature,
  getInputsFromSignature,
} from "./utils/formatters.js";
import {
  askAbiMethod,
  formatMethodString,
  readAbiFromFile,
} from "./utils/helpers.js";

import type { Command } from "commander";
import type { DistinctQuestion } from "inquirer";
import type { ABI } from "./utils/helpers.js";

type EncodeOptions = {
  method?: string;
  arguments?: Array<string | string[]>;
  abi?: string;
};

// ----------------
// prompts
// ----------------

const askMethod = async (
  contractAbi: ABI | undefined,
  options: EncodeOptions
) => {
  if (options.method) {
    return;
  }

  const methodByAbi = await askAbiMethod({ abi: contractAbi });
  if (methodByAbi !== "manual") {
    const fullMethodName = methodByAbi.format(ethers.utils.FormatTypes.full);
    options.method = formatMethodString(fullMethodName);
    return;
  }

  const answers: Pick<EncodeOptions, "method"> = await inquirer.prompt(
    [
      {
        message: "Enter method to encode",
        name: optionNameToParam(methodOption.long!),
        type: "input",
        validate: (input: string) => {
          try {
            getFragmentFromSignature(input); // throws if invalid
            return true;
          } catch {
            return `Invalid method signature. Example: ${chalk.blueBright("balanceOf(address)")}`;
          }
        },
      },
    ],
    options
  );

  options.method = answers.method;
};

const askArguments = async (method: string, options: EncodeOptions) => {
  if (options.arguments) {
    return;
  }
  const inputs = getInputsFromSignature(method);
  if (!inputs.length) {
    options.arguments = [];
    return;
  }
  Logger.info(chalk.green("?") + chalk.bold(" Provide method arguments:"));
  const prompts: DistinctQuestion[] = [];

  inputs.forEach((input, index) => {
    let name = chalk.gray(`[${index + 1}/${inputs.length}]`);
    if (input.name) {
      name += ` ${input.name}`;
      name += chalk.gray(` (${input.type})`);
    } else {
      name += ` ${input.type}`;
    }

    prompts.push({
      message: name,
      name: index.toString(),
      type: "input",
    });
  });

  const answers = await inquirer.prompt(prompts);
  options.arguments = Object.values(answers);
};

// ----------------
// request handler
// ----------------

export const handler = async (options: EncodeOptions, context: Command) => {
  try {
    let abi: ABI | undefined;
    if (options.abi) {
      abi = readAbiFromFile(options.abi);
      Logger.info(chalk.gray("Using provided ABI file"));
    }
    await askMethod(abi, options);
    await askArguments(options.method!, options);

    options.arguments = formatArgs(options.method!, options.arguments!);
    const data = encodeData(options.method!, options.arguments!);
    Logger.info("");
    Logger.info(chalk.greenBright("✔ Encoded data: ") + data);
    logFullCommandFromOptions(options, context, { emptyLine: true });
  } catch (error) {
    Logger.error("There was an error while performing encoding");
    Logger.error(error);
  }
};

Program.command("encode")
  .addOption(methodOption)
  .addOption(argumentsOption)
  .addOption(abiOption)
  .description(
    "Get calldata (e.g. 0x1234) from contract method signature and arguments"
  )
  .action(handler);
