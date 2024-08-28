import { BigNumber } from "ethers";
import { getAddress } from "ethers/lib/utils.js";
import { utils } from "zksync-ethers";

import { ETH_TOKEN } from "./constants.js";

import type { BigNumberish, ethers } from "ethers";
import type { Provider } from "zksync-ethers";

type Token = {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  l1Address?: string;
};

const getTokenAddresses = async (
  tokenAddress: string,
  provider: Provider,
  l1Provider?: ethers.providers.JsonRpcProvider
) => {
  let tokenL2Address: string | undefined;
  let tokenL1Address: string | undefined;
  if ((await provider.getCode(tokenAddress)) === "0x") {
    tokenL1Address = tokenAddress;
    const l2Address = await provider.l2TokenAddress(tokenAddress);
    if (!l1Provider || (await l1Provider.getCode(tokenAddress)) === "0x") {
      throw new Error("Token with specified address was not found");
    }
    if ((await provider.getCode(l2Address)) !== "0x") {
      tokenL2Address = l2Address;
    }
  } else {
    tokenL2Address = tokenAddress;
    const l1Address = await provider.l1TokenAddress(tokenAddress);
    // when token doesn't exist on L1 it resolves to Ether address
    if (l1Address !== ETH_TOKEN.l1Address) {
      tokenL1Address = l1Address;
    }
  }
  return {
    address: tokenL2Address ? getAddress(tokenL2Address) : undefined,
    l1Address: tokenL1Address ? getAddress(tokenL1Address) : undefined,
  };
};

export const getTokenInfo = async (
  tokenAddress: string,
  l2Provider: Provider,
  l1Provider?: ethers.providers.JsonRpcProvider
): Promise<Omit<Token, "address"> & { address?: string }> => {
  if (
    tokenAddress === ETH_TOKEN.address ||
    tokenAddress === ETH_TOKEN.l1Address
  ) {
    return ETH_TOKEN;
  }

  const { address, l1Address } = await getTokenAddresses(
    tokenAddress,
    l2Provider,
    l1Provider
  );
  if (!address && !l1Provider) {
    throw new Error("Token with specified address was not found");
  }
  const provider = address ? l2Provider : l1Provider!;
  const tokenContractAddress = address || l1Address!;
  const [symbol, name, decimals] = await Promise.all([
    provider.call({
      to: tokenContractAddress,
      data: utils.IERC20.encodeFunctionData("symbol()"),
    }),
    provider.call({
      to: tokenContractAddress,
      data: utils.IERC20.encodeFunctionData("name()"),
    }),
    provider.call({
      to: tokenContractAddress,
      data: utils.IERC20.encodeFunctionData("decimals()"),
    }),
  ]);
  return {
    address,
    symbol: utils.IERC20.decodeFunctionResult("symbol()", symbol).toString(),
    name: utils.IERC20.decodeFunctionResult("name()", name).toString(),
    decimals: parseInt(decimals, 16),
    l1Address,
  };
};

export const getBalance = async (
  tokenAddress: string,
  address: string,
  provider: Provider | ethers.providers.JsonRpcProvider
): Promise<BigNumberish> => {
  if (
    tokenAddress === ETH_TOKEN.address ||
    tokenAddress === ETH_TOKEN.l1Address
  ) {
    return provider.getBalance(address);
  }
  const balanceAbi = "balanceOf(address)";
  return BigNumber.from(
    await provider.call({
      to: tokenAddress,
      data: utils.IERC20.encodeFunctionData(balanceAbi, [address]),
    })
  );
};
