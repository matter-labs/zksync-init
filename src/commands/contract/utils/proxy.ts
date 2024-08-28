import { BigNumber, ethers } from "ethers";
import { isAddress } from "ethers/lib/utils.js";

import { ETH_TOKEN } from "../../../utils/constants.js";

import type { Provider } from "zksync-ethers";

const PROXY_CONTRACT_IMPLEMENTATION_ABI = [
  {
    inputs: [],
    name: "implementation",
    outputs: [
      {
        internalType: "address",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

const EIP1967_PROXY_IMPLEMENTATION_SLOT = BigNumber.from(
  ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("eip1967.proxy.implementation")
  )
)
  .sub(1)
  .toHexString();
const EIP1967_PROXY_BEACON_SLOT = BigNumber.from(
  ethers.utils.keccak256(ethers.utils.toUtf8Bytes("eip1967.proxy.beacon"))
)
  .sub(1)
  .toHexString();
const EIP1822_PROXY_IMPLEMENTATION_SLOT = ethers.utils.keccak256(
  ethers.utils.toUtf8Bytes("PROXIABLE")
);

const getAddressSafe = async (getAddressFn: () => Promise<string>) => {
  try {
    const addressBytes = await getAddressFn();
    const address = `0x${addressBytes.slice(-40)}`;
    if (!isAddress(address) || address === ETH_TOKEN.l1Address) {
      return;
    }
    return address;
  } catch {
    return;
  }
};

export const getProxyImplementation = async (
  proxyContractAddress: string,
  provider: Provider
): Promise<string | undefined> => {
  const proxyContract = new ethers.Contract(
    proxyContractAddress,
    PROXY_CONTRACT_IMPLEMENTATION_ABI,
    provider
  );
  const [
    implementation,
    eip1967Implementation,
    eip1967Beacon,
    eip1822Implementation,
  ] = await Promise.all([
    getAddressSafe(() => proxyContract.implementation()),
    getAddressSafe(() =>
      provider.getStorageAt(
        proxyContractAddress,
        EIP1967_PROXY_IMPLEMENTATION_SLOT
      )
    ),
    getAddressSafe(() =>
      provider.getStorageAt(proxyContractAddress, EIP1967_PROXY_BEACON_SLOT)
    ),
    getAddressSafe(() =>
      provider.getStorageAt(
        proxyContractAddress,
        EIP1822_PROXY_IMPLEMENTATION_SLOT
      )
    ),
  ]);
  if (implementation) {
    return implementation;
  }
  if (eip1967Implementation) {
    return eip1967Implementation;
  }
  if (eip1822Implementation) {
    return eip1822Implementation;
  }
  if (eip1967Beacon) {
    const beaconContract = new ethers.Contract(
      eip1967Beacon,
      PROXY_CONTRACT_IMPLEMENTATION_ABI,
      provider
    );
    return getAddressSafe(() => beaconContract.implementation());
  }
};
