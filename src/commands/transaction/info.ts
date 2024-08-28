import chalk from "chalk";
import { Option } from "commander";
import { BigNumber, ethers } from "ethers";
import inquirer from "inquirer";
import ora from "ora";
import { utils } from "zksync-ethers";

import { chainOption, l2RpcUrlOption } from "../../common/options.js";
import { promptChain } from "../../common/prompts.js";
import { ETH_TOKEN } from "../../utils/constants.js";
import {
  convertBigNumbersToStrings,
  formatSeparator,
  getTimeAgo,
  useDecimals,
} from "../../utils/formatters.js";
import { getL2Provider, optionNameToParam } from "../../utils/helpers.js";
import Logger from "../../utils/logger.js";
import { isTransactionHash } from "../../utils/validators.js";
import { abiOption } from "../contract/common/options.js";
import {
  getContractInformation,
  readAbiFromFile,
} from "../contract/utils/helpers.js";
import Program from "./command.js";

import type { Provider } from "zksync-ethers";
import type { TransactionReceipt } from "zksync-ethers/src/types.js";
import type { L2Chain } from "../../data/chains.js";

type TransactionInfoOptions = {
  chain?: string;
  rpc?: string;
  transaction?: string;
  full?: boolean;
  raw?: boolean;
  abi?: string;
};

const transactionHashOption = new Option(
  "--tx, --transaction <transaction hash>",
  "Transaction hash"
);
const fullOption = new Option("--full", "Show all available data");
const rawOption = new Option("--raw", "Show raw JSON response");

export const handler = async (options: TransactionInfoOptions) => {
  const getTransactionFeeData = (receipt: TransactionReceipt) => {
    const transfers: { amount: BigNumber; from: string; to: string }[] = [];
    receipt.logs.forEach((log) => {
      try {
        const parsed = utils.IERC20.decodeEventLog(
          "Transfer",
          log.data,
          log.topics
        );
        transfers.push({
          from: parsed.from,
          to: parsed.to,
          amount: parsed.value,
        });
      } catch {
        // ignore
      }
    });
    const totalFee = receipt.gasUsed.mul(receipt.effectiveGasPrice);
    const refunded = transfers.reduce((acc, transfer) => {
      if (transfer.from === utils.BOOTLOADER_FORMAL_ADDRESS) {
        return acc.add(transfer.amount);
      }
      return acc;
    }, BigNumber.from("0"));

    return {
      refunded,
      totalFee,
      paidByPaymaster:
        !transfers.length ||
        receipt.from !==
          transfers.find(
            (transfer) => transfer.from === utils.BOOTLOADER_FORMAL_ADDRESS
          )?.to,
    };
  };
  const getDecodedMethodSignature = async (hexSignature: string) => {
    if (hexSignature === "0x") {
      return;
    }
    return await fetch(
      `https://www.4byte.directory/api/v1/signatures/?format=json&hex_signature=${hexSignature}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    )
      .then((res) => res.json())
      .then((data) => data?.results?.[0]?.text_signature)
      .catch(() => undefined);
  };
  const getAddressAndMethodInfo = async (
    address: string,
    calldata: string,
    provider: Provider,
    chain: L2Chain
  ) => {
    let contractInfo = await getContractInformation(chain, provider, address, {
      fetchImplementation: true,
    }).catch(() => undefined);
    const hexSignature = calldata.slice(0, 10);
    let decodedSignature: string | undefined;
    let decodedArgs:
      | { name?: string; type: string; value: string }[]
      | undefined;
    if (options.abi) {
      if (!contractInfo) {
        contractInfo = {
          address,
          bytecode: "0x",
          abi: readAbiFromFile(options.abi),
        };
      } else {
        contractInfo.abi = readAbiFromFile(options.abi);
      }
    }
    if (contractInfo?.abi || contractInfo?.implementation?.abi) {
      const initialAddressInterface = new ethers.utils.Interface(
        contractInfo?.abi || []
      );
      const implementationInterface = new ethers.utils.Interface(
        contractInfo?.implementation?.abi || []
      );
      const matchedMethod =
        initialAddressInterface.getFunction(hexSignature) ||
        implementationInterface.getFunction(hexSignature);
      if (matchedMethod) {
        decodedSignature = matchedMethod.format(ethers.utils.FormatTypes.full);
        if (decodedSignature.startsWith("function")) {
          decodedSignature = decodedSignature.slice("function".length + 1);
        }
      }
    }

    if (!decodedSignature) {
      decodedSignature = await getDecodedMethodSignature(hexSignature);
    }

    if (decodedSignature) {
      try {
        const contractInterface = new ethers.utils.Interface([
          `function ${decodedSignature}`,
        ]);
        const inputs = contractInterface.getFunction(hexSignature).inputs;
        const encodedArgs = calldata.slice(10);
        const decoded = ethers.utils.defaultAbiCoder.decode(
          inputs,
          `0x${encodedArgs}`
        );
        decodedArgs = inputs.map((input, index) => {
          return {
            name: input.name,
            type: input.type,
            value: decoded[index]?.toString(),
          };
        });
      } catch {
        // ignore
      }
    }

    return {
      contractInfo,
      hexSignature,
      decodedSignature,
      decodedArgs,
    };
  };

  try {
    const chain = await promptChain(
      {
        message: chainOption.description,
        name: optionNameToParam(chainOption.long!),
      },
      undefined,
      options
    );

    const answers: TransactionInfoOptions = await inquirer.prompt(
      [
        {
          message: transactionHashOption.description,
          name: optionNameToParam(transactionHashOption.long!),
          type: "input",
          required: true,
          validate: (input: string) => isTransactionHash(input),
        },
      ],
      options
    );
    options = {
      ...options,
      ...answers,
    };

    const l2Provider = getL2Provider(options.rpc ?? chain!.rpcUrl);
    const spinner = ora("Looking for transaction...").start();
    try {
      const [transactionData, transactionDetails, transactionReceipt] =
        await Promise.all([
          l2Provider.getTransaction(options.transaction!),
          l2Provider.getTransactionDetails(options.transaction!),
          l2Provider.getTransactionReceipt(options.transaction!),
        ]);
      if (!transactionData) {
        throw new Error("Transaction not found");
      }
      const {
        contractInfo,
        hexSignature: methodHexSignature,
        decodedSignature: methodDecodedSignature,
        decodedArgs: methodDecodedArgs,
      } = await getAddressAndMethodInfo(
        transactionData.to!,
        transactionData.data,
        l2Provider,
        chain
      );
      spinner.stop();
      if (options.raw) {
        Logger.info(
          JSON.stringify(
            convertBigNumbersToStrings(
              transactionReceipt || transactionDetails || transactionData
            ),
            null,
            2
          ),
          {
            noFormat: true,
          }
        );
        return;
      }

      const { bigNumberToDecimal } = useDecimals(ETH_TOKEN.decimals);

      Logger.info(formatSeparator("Main info").line, { noFormat: true });
      let logString = "";
      /* Main */
      logString += `Transaction hash: ${transactionData.hash}`;
      logString += "\nStatus: ";
      if (transactionDetails?.status === "failed") {
        logString += chalk.redBright("failed");
      } else if (
        transactionDetails?.status === "included" ||
        transactionDetails?.status === "verified"
      ) {
        logString += chalk.greenBright("completed");
      } else {
        logString += transactionDetails?.status || chalk.gray("N/A");
      }
      logString += `\nFrom: ${transactionData.from}`;
      logString += `\nTo: ${transactionData.to}`;
      if (contractInfo?.implementation) {
        logString += chalk.gray("  |");
        logString += chalk.gray(
          `  Implementation: ${contractInfo.implementation.address}`
        );
      }
      logString += `\nValue: ${bigNumberToDecimal(transactionData.value)} ETH`;

      const initialFee = transactionData.gasLimit.mul(
        transactionData.gasPrice!
      );
      const feeData = transactionReceipt
        ? getTransactionFeeData(transactionReceipt)
        : undefined;
      logString += `\nFee: ${bigNumberToDecimal(feeData?.totalFee || initialFee)} ETH`;
      if (feeData?.paidByPaymaster) {
        logString += chalk.gray(" (paid by paymaster)");
      }
      if (feeData) {
        logString += chalk.gray("  |");
        logString += chalk.gray(
          `  Initial: ${bigNumberToDecimal(initialFee)} ETH`
        );
        logString += chalk.gray(
          `  Refunded: ${bigNumberToDecimal(feeData.refunded)} ETH`
        );
      }

      logString += "\nMethod: ";
      if (methodDecodedSignature) {
        logString += `${methodDecodedSignature} `;
      }
      if (methodHexSignature !== "0x") {
        logString += chalk.gray(methodHexSignature);
      } else {
        logString += chalk.gray("N/A");
      }
      Logger.info(logString, { noFormat: true });
      logString = "";

      if (methodDecodedArgs) {
        Logger.info(`\n${formatSeparator("Method arguments").line}`, {
          noFormat: true,
        });
        methodDecodedArgs.forEach((arg, index) => {
          if (index !== 0) {
            logString += "\n";
          }
          logString += `[${index + 1}] `;
          if (arg.name) {
            logString += `${arg.name} ${chalk.gray(`(${arg.type})`)}: `;
          } else {
            logString += `${chalk.gray(arg.type)}: `;
          }
          logString += arg.value;
        });
        Logger.info(logString, { noFormat: true });
        logString = "";
      }

      Logger.info(`\n${formatSeparator("Details").line}`, { noFormat: true });
      logString += "Date: ";
      let transactionDate: Date | undefined;
      if (transactionData.timestamp) {
        transactionDate = new Date(transactionData.timestamp);
      } else if (transactionDetails?.receivedAt) {
        transactionDate = new Date(transactionDetails.receivedAt);
      }
      if (transactionDate) {
        logString += transactionDate.toLocaleString();
        logString += chalk.gray(` (${getTimeAgo(transactionDate)})`);
      } else {
        logString += chalk.gray("N/A");
      }
      logString += `\nBlock: #${transactionData.blockNumber}`;
      logString += `\nNonce: ${transactionData.nonce}`;
      if (options.full) {
        logString += `\nTransaction type: ${transactionData.type}`;
        logString += `\nEthereum commit hash: ${transactionDetails?.ethCommitTxHash || chalk.gray("in progress")}`;
        logString += `\nEthereum prove hash: ${transactionDetails?.ethProveTxHash || chalk.gray("in progress")}`;
        logString += `\nEthereum execute hash: ${transactionDetails?.ethExecuteTxHash || chalk.gray("in progress")}`;
      }
      Logger.info(logString, { noFormat: true });
    } finally {
      spinner.stop();
    }
  } catch (error) {
    Logger.error("There was an error getting transaction info:");
    Logger.error(error);
  }
};

Program.command("info")
  .description("Get transaction info")
  .addOption(transactionHashOption)
  .addOption(chainOption)
  .addOption(l2RpcUrlOption)
  .addOption(fullOption)
  .addOption(rawOption)
  .addOption(abiOption)
  .action(handler);
