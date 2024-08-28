export type Chain = {
  id: number;
  name: string;
  network: string;
  rpcUrl: string;
  explorerUrl?: string;
};

const mainnet: Chain = {
  id: 1,
  name: "Ethereum Mainnet",
  network: "mainnet",
  rpcUrl: "https://cloudflare-eth.com",
  explorerUrl: "https://etherscan.io",
};
const sepolia: Chain = {
  id: 11155111,
  name: "Ethereum Sepolia Testnet",
  network: "sepolia",
  rpcUrl: "https://rpc.ankr.com/eth_sepolia",
  explorerUrl: "https://sepolia.etherscan.io",
};

export type L2Chain = Chain & {
  l1Chain?: Chain;
  blockExplorerApiUrl?: string;
  verificationApiUrl?: string;
};
export const l2Chains: L2Chain[] = [
  {
    id: 300,
    name: "ZKsync Sepolia Testnet",
    network: "zksync-sepolia",
    rpcUrl: "https://sepolia.era.zksync.dev",
    explorerUrl: "https://sepolia.explorer.zksync.io",
    verificationApiUrl: "https://explorer.sepolia.era.zksync.dev",
    l1Chain: sepolia,
  },
  {
    id: 324,
    name: "ZKsync Mainnet",
    network: "zksync-mainnet",
    rpcUrl: "https://mainnet.era.zksync.io",
    explorerUrl: "https://explorer.zksync.io",
    verificationApiUrl: "https://zksync2-mainnet-explorer.zksync.io",
    l1Chain: mainnet,
  },
  {
    id: 260,
    name: "In-memory local node",
    network: "in-memory-node",
    rpcUrl: "http://127.0.0.1:8011",
  },
  {
    id: 270,
    name: "Dockerized local node",
    network: "dockerized-node",
    rpcUrl: "http://127.0.0.1:3050",
    l1Chain: {
      id: 9,
      name: "L1 Local",
      network: "l1-local",
      rpcUrl: "http://127.0.0.1:8545",
    },
  },
];
