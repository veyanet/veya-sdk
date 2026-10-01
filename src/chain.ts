/**
 * Robinhood Chain defaults for the VEYA SDK.
 *
 * Settlement is EVM. The protocol contract is Veya.sol — it
 * stores environment / agent / commitment state. It is not an ERC-20.
 */

import { VeyaSdkError, assertHexAddress } from "./errors/veya-error.js";

export const ROBINHOOD_TESTNET_CHAIN_ID = 46630;

export const ROBINHOOD_TESTNET = {
  chainId: ROBINHOOD_TESTNET_CHAIN_ID,
  chainIdHex: "0xb626",
  name: "Robinhood Chain Testnet",
  rpcUrl: "https://rpc.testnet.chain.robinhood.com",
  explorerUrl: "https://explorer.testnet.chain.robinhood.com",
  nativeCurrency: {
    name: "ETH",
    symbol: "ETH",
    decimals: 18,
  },
  /** Deployed Veya.sol (protocol, not a token). */
  contractAddress: "0x1a1Dc3c55550FCE9F70ef6cDEeF967c0b72a5d84",
  faucetUrl: "https://faucet.testnet.chain.robinhood.com/",
} as const;

export const ROBINHOOD_TESTNET_FAUCET_URL = ROBINHOOD_TESTNET.faucetUrl;

/** Robinhood Chain mainnet. Veya.sol deployed 2026-10-05. */
export const ROBINHOOD_MAINNET_CHAIN_ID = 4663;

export const ROBINHOOD_MAINNET = {
  chainId: ROBINHOOD_MAINNET_CHAIN_ID,
  chainIdHex: "0x1237",
  name: "Robinhood Chain",
  rpcUrl: "https://rpc.mainnet.chain.robinhood.com",
  explorerUrl: "https://robinhoodchain.blockscout.com",
  nativeCurrency: {
    name: "ETH",
    symbol: "ETH",
    decimals: 18,
  },
  /** Deploy tx 0x20207430b768f2215e68a0f37739070599362047493acf1b90a2eba2b7653559 */
  contractAddress: "0x87dC582eEA544A434a5C1e30Ca3d12c1e548a674",
} as const;

/** 0.01 ETH. Projected fee above this, at the gas ceiling, sends nothing. */
export const MAINNET_MAX_FEE_WEI = 10n ** 16n;
export const MAINNET_GAS_CEILING = 300_000;

export type VeyaNetworkName = "testnet" | "mainnet";

export type RobinhoodNetwork = typeof ROBINHOOD_TESTNET | typeof ROBINHOOD_MAINNET;

/**
 * Explicit "mainnet" or "testnet" wins. Otherwise ROBINHOOD_NETWORK=testnet
 * selects the previous testnet profile. Unset, and any other value, is mainnet.
 */
export function resolveNetworkName(explicit?: string | null): VeyaNetworkName {
  const raw = (explicit ?? "").trim().toLowerCase();
  if (raw === "mainnet" || raw === "testnet") return raw;
  const env = (process.env.ROBINHOOD_NETWORK ?? "").trim().toLowerCase();
  return env === "testnet" ? "testnet" : "mainnet";
}

export function isRobinhoodMainnet(chainId: number | bigint): boolean {
  return BigInt(chainId) === BigInt(ROBINHOOD_MAINNET_CHAIN_ID);
}

/** Refuse a mainnet write whose gas price would push the ceiling past 0.01 ETH. */
export function assertMainnetFee(gasPriceWei: bigint): void {
  if (gasPriceWei < 0n) {
    throw new VeyaSdkError("FEE_CAP", "Mainnet gas price must be non-negative. Nothing was sent.");
  }
  const projected = gasPriceWei * BigInt(MAINNET_GAS_CEILING);
  if (projected > MAINNET_MAX_FEE_WEI) {
    throw new VeyaSdkError("FEE_CAP", "Mainnet fee would exceed 0.01 ETH. Nothing was sent.", {
      projectedWei: projected.toString(),
      maxFeeWei: MAINNET_MAX_FEE_WEI.toString(),
      gasCeiling: MAINNET_GAS_CEILING,
    });
  }
}

/**
 * wallet_addEthereumChain payload for MetaMask / injected wallets.
 * The dashboard uses the same numbers; keep this the single source.
 */
/** Profile picked by `resolveNetworkName()`: Mainnet unless `ROBINHOOD_NETWORK=testnet`. */
export function defaultRobinhoodProfile(): RobinhoodNetwork {
  return resolveNetworkName() === "testnet" ? ROBINHOOD_TESTNET : ROBINHOOD_MAINNET;
}

export function walletAddChainParams(network: RobinhoodNetwork = defaultRobinhoodProfile()) {
  return {
    chainId: network.chainIdHex,
    chainName: network.name,
    nativeCurrency: { ...network.nativeCurrency },
    rpcUrls: [network.rpcUrl],
    blockExplorerUrls: [network.explorerUrl],
  };
}

export function explorerTxUrl(
  txHash: string,
  explorerBase: string = defaultRobinhoodProfile().explorerUrl,
): string {
  const hash = txHash.startsWith("0x") ? txHash : `0x${txHash}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) {
    throw new VeyaSdkError("INVALID_HEX", "transaction hash must be 32 bytes", { txHash });
  }
  return `${explorerBase.replace(/\/$/, "")}/tx/${hash}`;
}

export function explorerAddressUrl(
  address: string,
  explorerBase: string = defaultRobinhoodProfile().explorerUrl,
): string {
  const addr = assertHexAddress(address, "explorer address");
  return `${explorerBase.replace(/\/$/, "")}/address/${addr}`;
}

export function explorerContractUrl(
  address: string = defaultRobinhoodProfile().contractAddress,
  explorerBase: string = defaultRobinhoodProfile().explorerUrl,
): string {
  return explorerAddressUrl(address, explorerBase);
}

export function isRobinhoodTestnet(chainId: number | bigint): boolean {
  return BigInt(chainId) === BigInt(ROBINHOOD_TESTNET_CHAIN_ID);
}

export function parseChainId(value: string | number | bigint | undefined, fallback: number): number {
  if (value == null || value === "") return fallback;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    throw new VeyaSdkError("INVALID_CONFIG", "chainId must be a positive integer", { value });
  }
  return n;
}

export function normalizeRpcUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("protocol");
    }
    return parsed.toString().replace(/\/$/, "");
  } catch {
    throw new VeyaSdkError("INVALID_CONFIG", "rpcUrl must be an http(s) origin", { url });
  }
}

export async function pingRpc(rpcUrl: string): Promise<{ chainId: bigint; blockNumber: number }> {
  const { ethers } = await import("ethers");
  const provider = new ethers.JsonRpcProvider(normalizeRpcUrl(rpcUrl));
  try {
    const [network, block] = await Promise.all([provider.getNetwork(), provider.getBlockNumber()]);
    return { chainId: network.chainId, blockNumber: block };
  } catch (err) {
    throw new VeyaSdkError("RPC_UNREACHABLE", "Robinhood JSON-RPC did not respond", {
      rpcUrl,
      cause: err instanceof Error ? err.message : String(err),
    });
  }
}
