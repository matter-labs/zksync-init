import chalk from "chalk";
import inquirer from "inquirer";
import ora from "ora";

import {
  amountOptionCreate,
  chainOption,
  l2RpcUrlOption,
  privateKeyOption,
  recipientOptionCreate,
  tokenOption,
  zeekOption,
} from "../../common/options.js";
import { l2Chains } from "../../data/chains.js";
import { ETH_TOKEN } from "../../utils/constants.js";
import { useDecimals } from "../../utils/formatters.js";
import {
  getL2Provider,
  getL2Wallet,
  optionNameToParam,
} from "../../utils/helpers.js";
import Logger from "../../utils/logger.js";
import { getBalance, getTokenInfo } from "../../utils/token.js";
import {
  isAddress,
  isDecimalAmount,
  isPrivateKey,
} from "../../utils/validators.js";
import zeek from "../../utils/zeek.js";
import { getChains } from "../config/chains.js";
import Program from "./command.js";

import type { DefaultTransferOptions } from "../../common/options.js";

const amountOption = amountOptionCreate("transfer");
const recipientOption = recipientOptionCreate("L2");

type TransferOptions = DefaultTransferOptions;

export const handler = async (options: TransferOptions) => {
  try {
    const chains = [...l2Chains, ...getChains()];
    const answers: TransferOptions = await inquirer.prompt(
      [
        {
          message: chainOption.description,
          name: optionNameToParam(chainOption.long!),
          type: "list",
          choices: chains.map((e) => ({ name: e.name, value: e.network })),
          required: true,
          when(answers: TransferOptions) {
            if (answers.rpc) {
              return false;
            }
            return true;
          },
        },
        {
          message: amountOption.description,
          name: optionNameToParam(amountOption.long!),
          type: "input",
          required: true,
          validate: (input: string) => isDecimalAmount(input),
        },
        {
          message: privateKeyOption.description,
          name: optionNameToParam(privateKeyOption.long!),
          type: "password",
          required: true,
          validate: (input: string) => isPrivateKey(input),
        },
        {
          message: recipientOption.description,
          name: optionNameToParam(recipientOption.long!),
          type: "input",
          required: true,
          validate: (input: string) => isAddress(input),
        },
      ],
      options
    );

    options = {
      ...options,
      ...answers,
    };

    const selectedChain = chains.find((e) => e.network === options.chain);
    const l2Provider = getL2Provider(options.rpc ?? selectedChain!.rpcUrl);
    const senderWallet = getL2Wallet(options.privateKey, l2Provider);
    const token = options.token
      ? await getTokenInfo(options.token!, l2Provider)
      : ETH_TOKEN;
    const { decimalToBigNumber, bigNumberToDecimal } = useDecimals(
      token.decimals
    );
    if (!token.address) {
      throw new Error(
        `Token ${token.symbol} does not exist on ${selectedChain?.name}`
      );
    }

    const spinner = ora("Sending transfer...").start();
    try {
      const transferHandle = await senderWallet.transfer({
        to: options.recipient,
        amount: decimalToBigNumber(options.amount),
        token: options.token ? token.address : undefined,
      });
      const transferReceipt = await transferHandle.wait();
      spinner.stop();
      Logger.info("\nTransfer sent:");
      Logger.info(` Transaction hash: ${transferReceipt.transactionHash}`);
      if (selectedChain?.explorerUrl) {
        Logger.info(
          ` Transaction link: ${selectedChain.explorerUrl}/tx/${transferReceipt.transactionHash}`
        );
      }

      const senderBalance = await getBalance(
        token.address,
        senderWallet.address,
        l2Provider
      );
      Logger.info(
        `\nSender L2 balance after transaction: ${bigNumberToDecimal(senderBalance)} ${token.symbol} ${
          token.name ? chalk.gray(`(${token.name})`) : ""
        }`
      );
    } catch (error) {
      spinner.fail("Transfer failed");
      throw error;
    }

    if (options.zeek) {
      zeek();
    }
  } catch (error) {
    Logger.error("There was an error while doing transfer");
    Logger.error(error);
  }
};

Program.command("transfer")
  .description("Transfer token on L2 to another account")
  .addOption(amountOption)
  .addOption(chainOption)
  .addOption(recipientOption)
  .addOption(l2RpcUrlOption)
  .addOption(privateKeyOption)
  .addOption(tokenOption)
  .addOption(zeekOption)
  .action(handler);
