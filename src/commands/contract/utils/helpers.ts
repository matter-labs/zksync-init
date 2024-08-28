import fs from "fs";
import chalk from "chalk";
import { ethers } from "ethers";
import inquirer from "inquirer";
import ora from "ora";

import { fileOrDirExists } from "../../../utils/files.js";
import { formatSeparator } from "../../../utils/formatters.js";
import Logger from "../../../utils/logger.js";
import { getMethodId } from "./formatters.js";
import { getProxyImplementation } from "./proxy.js";

import type { AsyncDynamicQuestionProperty, DistinctChoice } from "inquirer";
import type { Provider } from "zksync-ethers";
import type { L2Chain } from "../../../data/chains.js";

export type ABI = Record<string, unknown>[];
export type ContractInfo = {
  address: string;
  bytecode: string;
  abi: ABI | undefined;
  implementation?: ContractInfo;
};

export const formatMethodString = (method: string): string => {
  // remove "function " prefix and return type
  // e.g. "greet() view returns (string)" -> "greet()"
  return method.substring("function ".length).replace(/\).+$/, ")");
};

export const getMethodsFromAbi = (
  abi: ABI,
  type: "read" | "write" | "any"
): ethers.utils.FunctionFragment[] => {
  const getReadMethods = () => {
    const readMethods = abi.filter(
      (fragment) =>
        fragment.type === "function" &&
        (fragment.stateMutability === "view" ||
          fragment.stateMutability === "pure")
    );
    const contractInterface = new ethers.utils.Interface(readMethods);
    return contractInterface.fragments as ethers.utils.FunctionFragment[];
  };
  const getWriteMethods = () => {
    const writeMethods = abi.filter(
      (fragment) =>
        fragment.type === "function" &&
        (fragment.stateMutability === "nonpayable" ||
          fragment.stateMutability === "payable")
    );
    const contractInterface = new ethers.utils.Interface(writeMethods);
    return contractInterface.fragments as ethers.utils.FunctionFragment[];
  };
  if (type === "read") {
    return getReadMethods();
  } else if (type === "write") {
    return getWriteMethods();
  }
  return [...getReadMethods(), ...getWriteMethods()];
};

export const checkIfMethodExists = (
  contractInfo: ContractInfo,
  method: string
) => {
  const methodId = getMethodId(method);
  if (!contractInfo.bytecode.includes(methodId)) {
    if (!contractInfo.implementation) {
      Logger.warn(
        "Provided method is not part of the contract and will only work if provided contract is a proxy"
      );
    } else if (!contractInfo.implementation.bytecode.includes(methodId)) {
      Logger.warn(
        "Provided method is not part of the provided contract nor its implementation"
      );
    }
  }
};

export const getContractABI = async (
  chain: L2Chain,
  contractAddress: string
) => {
  if (!chain.verificationApiUrl) return;
  const response = await fetch(
    `${chain.verificationApiUrl}/contract_verification/info/${contractAddress}`
  );
  const decoded: { artifacts: { abi: Record<string, unknown>[] } } =
    await response.json();
  return decoded.artifacts.abi;
};

export const readAbiFromFile = (abiFilePath: string): ABI => {
  if (!fileOrDirExists(abiFilePath)) {
    throw new Error(`ABI not found at specified location: ${abiFilePath}`);
  }
  const contents = fs.readFileSync(abiFilePath, "utf-8");
  try {
    const data = JSON.parse(contents);
    if (Array.isArray(data)) {
      return data;
    } else if (data?.abi) {
      return data.abi;
    }
    throw new Error("ABI wasn't found in the provided file");
  } catch (error) {
    throw new Error(
      `Failed to parse ABI file: ${error instanceof Error ? error.message : error}`
    );
  }
};

export const getContractInformation = async (
  chain: L2Chain | undefined,
  provider: Provider,
  contractAddress: string,
  options?: { fetchImplementation?: boolean }
): Promise<ContractInfo> => {
  const [bytecode, abi] = await Promise.all([
    provider.getCode(contractAddress),
    chain
      ? getContractABI(chain, contractAddress).catch(() => undefined)
      : undefined,
  ]);
  const contractInfo: ContractInfo = {
    address: contractAddress,
    bytecode,
    abi,
  };

  if (options?.fetchImplementation) {
    const implementationAddress = await getProxyImplementation(
      contractAddress,
      provider
    ).catch(() => undefined);
    if (implementationAddress) {
      const implementation = await getContractInformation(
        chain,
        provider,
        implementationAddress
      );
      contractInfo.implementation = implementation;
    }
  }

  return contractInfo;
};

export const getContractInfoWithLoader = async (
  chain: L2Chain | undefined,
  provider: Provider,
  contractAddress: string
): Promise<ContractInfo> => {
  const spinner = ora("Fetching contract information...").start();
  try {
    const contractInfo = await getContractInformation(
      chain,
      provider,
      contractAddress,
      { fetchImplementation: true }
    );
    if (contractInfo.bytecode === "0x") {
      throw new Error("Provided address is not a contract");
    }
    return contractInfo;
  } finally {
    spinner.stop();
  }
};

export const askAbiMethod = async (
  contractInfo: {
    abi?: ContractInfo["abi"];
    implementation?: ContractInfo["implementation"];
  },
  type: "read" | "write" | "any" = "any"
): Promise<ethers.utils.FunctionFragment | "manual"> => {
  if (!contractInfo.abi && !contractInfo.implementation?.abi) {
    return "manual";
  }

  const formatFragment = (
    fragment: ethers.utils.FunctionFragment
  ): DistinctChoice => {
    let name = fragment.format(ethers.utils.FormatTypes.full);
    if ((type === "write" || type === "any") && name.includes(" returns ")) {
      name = name.substring(0, name.indexOf(" returns ")); // remove return type for write methods
    }
    return {
      name: name.substring("function ".length), // remove "function " prefix
      value: fragment,
    };
  };

  const choices: AsyncDynamicQuestionProperty<DistinctChoice[]> = [];
  const separators = {
    noReadMethods: {
      type: "separator",
      line: chalk.white("No read methods found"),
    } as DistinctChoice,
    noWriteMethods: {
      type: "separator",
      line: chalk.white("No write methods found"),
    } as DistinctChoice,
    noMethods: {
      type: "separator",
      line: chalk.white("No methods found"),
    } as DistinctChoice,
    contractNotVerified: {
      type: "separator",
      line: chalk.white("Contract is not verified"),
    } as DistinctChoice,
  };
  choices.push(formatSeparator("Provided contract") as DistinctChoice);
  if (contractInfo.abi) {
    const methods = getMethodsFromAbi(contractInfo.abi, type);
    if (methods.length) {
      choices.push(...methods.map(formatFragment));
    } else {
      if (type === "read") {
        choices.push(separators.noReadMethods);
      } else if (type === "write") {
        choices.push(separators.noWriteMethods);
      } else {
        choices.push(separators.noMethods);
      }
    }
  } else {
    choices.push(separators.contractNotVerified);
  }
  if (contractInfo?.implementation) {
    if (contractInfo.implementation.abi) {
      choices.push(
        formatSeparator("Resolved implementation") as DistinctChoice
      );
      const implementationMethods = getMethodsFromAbi(
        contractInfo.implementation.abi,
        type
      );
      if (implementationMethods.length) {
        choices.push(...implementationMethods.map(formatFragment));
      } else {
        if (type === "read") {
          choices.push(separators.noReadMethods);
        } else if (type === "write") {
          choices.push(separators.noWriteMethods);
        } else {
          choices.push(separators.noMethods);
        }
      }
    } else {
      choices.push(separators.contractNotVerified);
    }
  }

  choices.push(formatSeparator("") as DistinctChoice);
  choices.push({
    name: "Type method manually",
    value: "manual",
  });

  const { method }: { method: ethers.utils.FunctionFragment | "manual" } =
    await inquirer.prompt([
      {
        message: "Contract method to call",
        name: "method",
        type: "list",
        choices,
        required: true,
        pageSize: 10,
        loop: false,
      },
    ]);

  return method;
};
