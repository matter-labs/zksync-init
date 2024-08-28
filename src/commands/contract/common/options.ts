import { Option } from "commander";

export const contractOption = new Option(
  "--contract <0x address>",
  "Contract address"
);
export const methodOption = new Option(
  "--method <someContractMethod(arguments)>",
  "Contract method to interact with"
);
export const argumentsOption = new Option(
  "--args, --arguments <arguments...>",
  "Arguments"
);
export const dataOption = new Option(
  "--data <Encoded transaction data>",
  "Transaction data (e.g. 0x1234)"
);
export const abiOption = new Option(
  "--abi <path/to/abi>",
  "Contract artifact or ABI file location"
);
export const showTransactionInfoOption = new Option(
  "--show-info",
  "Show transaction request info (e.g. encoded data)"
);
