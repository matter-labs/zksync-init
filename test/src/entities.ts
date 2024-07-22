import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({path: path.resolve(__dirname, ".env")});

export const adresses = {
  sepoliaTestnet: "0x52B6d10d7d865B3d4103f8809AA3521288568f46",
  zksyncMainnet: "0x52B6d10d7d865B3d4103f8809AA3521288568f46",
  goerliTestnet: "0x52B6d10d7d865B3d4103f8809AA3521288568f46",
};

export const contracts = {
  sepoliaTestnet: "0xE6c391927f0B42d82229fd3CFe3426F209D16b48",
};

export const wallet = {
  testnetPK: process.env.E2E_TESTNET_PK,
};
