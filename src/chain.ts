/**
 * Robinhood Chain defaults for the VEYA SDK.
 *
 * Settlement is EVM. There is no Solana program, no token mint, and no
 * brokerage API in this package. The protocol contract is Veya.sol — it
 * stores environment / agent / commitment state. It is not an ERC-20.
 */

import { VeyaSdkError, assertHexAddress } from "./errors/veya-error.js";

export const ROBINHOOD_TESTNET_CHAIN_ID = 46630;

export const ROBINHOOD_TESTNET = {
  chainId: ROBINHOOD_TESTNET_CHAIN_ID,
  chainIdHex: "0xb636",
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
} as const;

export type RobinhoodNetwork = typeof ROBINHOOD_TESTNET;

/**
 * wallet_addEthereumChain payload for MetaMask / injected wallets.
 * The dashboard uses the same numbers; keep this the single source.
 */
export function walletAddChainParams(network: RobinhoodNetwork = ROBINHOOD_TESTNET) {
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
  explorerBase: string = ROBINHOOD_TESTNET.explorerUrl,
): string {
  const hash = txHash.startsWith("0x") ? txHash : `0x${txHash}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) {
    throw new VeyaSdkError("INVALID_HEX", "transaction hash must be 32 bytes", { txHash });
  }
  return `${explorerBase.replace(/\/$/, "")}/tx/${hash}`;
}

export function explorerAddressUrl(
  address: string,
  explorerBase: string = ROBINHOOD_TESTNET.explorerUrl,
): string {
  const addr = assertHexAddress(address, "explorer address");
  return `${explorerBase.replace(/\/$/, "")}/address/${addr}`;
}

export function explorerContractUrl(
  address: string = ROBINHOOD_TESTNET.contractAddress,
  explorerBase: string = ROBINHOOD_TESTNET.explorerUrl,
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
