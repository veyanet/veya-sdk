/**
 * SDK configuration — Robinhood Chain RPC, Veya.sol address, payer key, local nodes.
 *
 * Resolution order: constructor options → process.env → ROBINHOOD_MAINNET defaults (ROBINHOOD_TESTNET only when network is "testnet").
 * Cryptographic modules (pq, memory, coordination) do not need RPC. Only
 * EvmAnchor writes require payerPrivateKey and a live chain id match.
 */

import {
  ROBINHOOD_MAINNET,
  ROBINHOOD_TESTNET,
  normalizeRpcUrl,
  parseChainId,
  resolveNetworkName,
  type VeyaNetworkName,
} from "./chain.js";
import { VeyaSdkError, assertHexAddress } from "./errors/veya-error.js";

export type VeyaClientConfig = {
  /**
   * Explicit profile. "testnet" selects the previous chain 46630 profile.
   * Unset stays mainnet unless ROBINHOOD_NETWORK=testnet.
   */
  network?: VeyaNetworkName;
  /** EVM JSON-RPC endpoint (Robinhood Chain Testnet by default). */
  rpcUrl?: string;
  /**
   * Deployed Veya.sol address. The mainnet profile uses
   * 0x87dC582eEA544A434a5C1e30Ca3d12c1e548a674 when this and
   * VEYA_MAINNET_CONTRACT_ADDRESS are unset. An explicit empty string
   * stays unpublished and sends nothing.
   */
  contractAddress?: string;
  /** EVM chain id. Unset uses 4663 on the default profile, or 46630 when network is testnet. */
  chainId?: number;
  /** Block explorer origin (no trailing slash). */
  explorerUrl?: string;
  /** Payer private key as hex string (never commit real secrets). */
  payerPrivateKey?: string;
  /** Validator node URLs for 2-of-3 consensus. */
  validatorNodes?: string[];
  /** Sealed-node origin for protected execution. */
  sealedNodeUrl?: string;
  /** Per-node HTTP timeout for consensus and sealed calls (ms). */
  requestTimeoutMs?: number;
};

export type ResolvedVeyaConfig = {
  network: VeyaNetworkName;
  rpcUrl: string;
  /** Mainnet pin, or "" when the caller passed an explicit empty contract. */
  contractAddress: string;
  chainId: number;
  explorerUrl: string;
  payerPrivateKey: string | undefined;
  validatorNodes: string[];
  sealedNodeUrl: string;
  requestTimeoutMs: number;
};

const DEFAULT_VALIDATORS = [
  "http://127.0.0.1:7701",
  "http://127.0.0.1:7702",
  "http://127.0.0.1:7703",
];

function parseNodeList(raw: string | undefined, fallback: string[]): string[] {
  if (!raw || !raw.trim()) return fallback;
  const nodes = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (nodes.length === 0) {
    throw new VeyaSdkError("INVALID_CONFIG", "VEYA_VALIDATOR_NODES parsed to an empty list");
  }
  for (const n of nodes) normalizeRpcUrl(n);
  return nodes;
}

function parsePrivateKey(raw: string | undefined): string | undefined {
  if (!raw || !raw.trim()) return undefined;
  const key = raw.trim();
  if (!/^0x[0-9a-fA-F]{64}$/.test(key)) {
    throw new VeyaSdkError(
      "INVALID_CONFIG",
      "payerPrivateKey must be 0x-prefixed 32-byte hex",
    );
  }
  return key;
}

function resolveContractAddress(network: VeyaNetworkName, explicit: string | undefined): string {
  if (network === "mainnet") {
    const raw = (explicit ?? process.env.VEYA_MAINNET_CONTRACT_ADDRESS ?? ROBINHOOD_MAINNET.contractAddress ?? "").trim();
    if (!raw) return "";
    return assertHexAddress(raw, "VEYA_MAINNET_CONTRACT_ADDRESS");
  }
  return assertHexAddress(
    explicit ??
      process.env.VEYA_PROTOCOL_CONTRACT_ADDRESS ??
      process.env.VEYA_CONTRACT_ADDRESS ??
      ROBINHOOD_TESTNET.contractAddress,
    "VEYA_PROTOCOL_CONTRACT_ADDRESS",
  );
}

export function resolveConfig(config: VeyaClientConfig = {}): ResolvedVeyaConfig {
  const network = resolveNetworkName(config.network);
  const profile = network === "mainnet" ? ROBINHOOD_MAINNET : ROBINHOOD_TESTNET;
  const rpcUrl = normalizeRpcUrl(
    config.rpcUrl ??
      (network === "mainnet" ? process.env.ROBINHOOD_MAINNET_RPC_URL : process.env.ROBINHOOD_RPC_URL) ??
      profile.rpcUrl,
  );
  const contractAddress = resolveContractAddress(network, config.contractAddress);
  const chainId = parseChainId(
    config.chainId ??
      (network === "mainnet" ? process.env.ROBINHOOD_MAINNET_CHAIN_ID : process.env.ROBINHOOD_CHAIN_ID),
    profile.chainId,
  );
  const explorerUrl = (
    config.explorerUrl ??
    (network === "mainnet"
      ? process.env.ROBINHOOD_MAINNET_EXPLORER_URL
      : process.env.ROBINHOOD_EXPLORER_URL) ??
    profile.explorerUrl
  ).replace(/\/$/, "");
  const sealedNodeUrl = normalizeRpcUrl(
    config.sealedNodeUrl ?? process.env.VEYA_SEALED_NODE_URL ?? "http://127.0.0.1:7800",
  );
  const requestTimeoutMs = config.requestTimeoutMs ?? Number(process.env.VEYA_SDK_TIMEOUT_MS ?? 15_000);
  if (!Number.isFinite(requestTimeoutMs) || requestTimeoutMs < 1_000) {
    throw new VeyaSdkError("INVALID_CONFIG", "requestTimeoutMs must be >= 1000");
  }

  const payerEnv =
    network === "mainnet"
      ? process.env.VEYA_MAINNET_RELAYER_PRIVATE_KEY
      : process.env.VEYA_DEPLOYER_PRIVATE_KEY;

  return {
    network,
    rpcUrl,
    contractAddress,
    chainId,
    explorerUrl,
    payerPrivateKey: parsePrivateKey(config.payerPrivateKey ?? payerEnv),
    validatorNodes: config.validatorNodes ?? parseNodeList(process.env.VEYA_VALIDATOR_NODES, DEFAULT_VALIDATORS),
    sealedNodeUrl,
    requestTimeoutMs,
  };
}

export function describeConfig(config: ResolvedVeyaConfig): Record<string, unknown> {
  return {
    network: config.network,
    rpcUrl: config.rpcUrl,
    contractAddress: config.contractAddress,
    chainId: config.chainId,
    explorerUrl: config.explorerUrl,
    payerConfigured: Boolean(config.payerPrivateKey),
    validatorNodes: config.validatorNodes,
    sealedNodeUrl: config.sealedNodeUrl,
    requestTimeoutMs: config.requestTimeoutMs,
  };
}
