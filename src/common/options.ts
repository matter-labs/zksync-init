import { Option } from "commander";

import { getChains } from "../commands/config/chains.js";
import { l2Chains } from "../data/chains.js";

const chains = [...l2Chains, ...getChains()];
export const chainOption = new Option(
  "--chain <chain>",
  "Chain to use"
).choices(chains.map((chain) => chain.network));
export const chainWithL1Option = new Option(
  "--chain <chain>",
  "Chain to use"
).choices(chains.filter((e) => e.l1Chain).map((chain) => chain.network));
export const l1RpcUrlOption = new Option(
  "--l1-rpc <URL>",
  "Override L1 RPC URL"
);
export const l2RpcUrlOption = new Option("--rpc <URL>", "Override L2 RPC URL");
export const tokenOption = new Option(
  "--token <0x address>",
  "ERC-20 token address"
);
export const accountOption = new Option(
  "--address <0x address>",
  "Account address"
);
export const privateKeyOption = new Option(
  "--pk, --private-key <wallet private key>",
  "Private key of the sender"
);
export const amountOptionCreate = (action: string) =>
  new Option("--amount <0.1>", `Amount to ${action}`);
export const recipientOptionCreate = (recipientLocation: string) =>
  new Option(
    "--to, --recipient <0x address>",
    `Recipient address on ${recipientLocation}`
  );
export const zeekOption = new Option(
  "--zeek",
  "zeek, the dev cat, will search for an inspirational quote and provide to you at the end of any command"
).hideHelp();

export type DefaultOptions = {
  zeek?: boolean;
};
export type DefaultTransactionOptions = DefaultOptions & {
  chain?: string;
  l1Rpc?: string;
  rpc?: string;
  privateKey: string;
};
export type DefaultTransferOptions = DefaultTransactionOptions & {
  amount: string;
  recipient: string;
  token: string;
};
