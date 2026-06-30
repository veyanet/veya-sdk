/**
 * SDK configuration — Robinhood Chain RPC, Veya.sol address, payer key, local nodes.
 *
 * Resolution order: constructor options → process.env → ROBINHOOD_TESTNET defaults.
 * Cryptographic modules (pq, memory, coordination) do not need RPC. Only
 * EvmAnchor writes require payerPrivateKey and a live chain id match.
 */

import { ROBINHOOD_TESTNET, normalizeRpcUrl, parseChainId } from "./chain.js";
import { VeyaSdkError, assertHexAddress } from "./errors/veya-error.js";

export type VeyaClientConfig = {
  /** EVM JSON-RPC endpoint (Robinhood Chain Testnet by default). */
  rpcUrl?: string;
  /** Deployed Veya.sol address. */
  contractAddress?: string;
  /** EVM chain id. Defaults to Robinhood testnet 46630. */
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
  rpcUrl: string;
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

export function resolveConfig(config: VeyaClientConfig = {}): ResolvedVeyaConfig {
  const rpcUrl = normalizeRpcUrl(
    config.rpcUrl ?? process.env.ROBINHOOD_RPC_URL ?? ROBINHOOD_TESTNET.rpcUrl,
  );
  const contractAddress = assertHexAddress(
    config.contractAddress ??
      process.env.VEYA_PROTOCOL_CONTRACT_ADDRESS ??
      process.env.VEYA_CONTRACT_ADDRESS ??
      ROBINHOOD_TESTNET.contractAddress,
    "VEYA_PROTOCOL_CONTRACT_ADDRESS",
  );
  const chainId = parseChainId(
    config.chainId ?? process.env.ROBINHOOD_CHAIN_ID,
    ROBINHOOD_TESTNET.chainId,
  );
  const explorerUrl = (
    config.explorerUrl ??
    process.env.ROBINHOOD_EXPLORER_URL ??
    ROBINHOOD_TESTNET.explorerUrl
  ).replace(/\/$/, "");
  const sealedNodeUrl = normalizeRpcUrl(
    config.sealedNodeUrl ?? process.env.VEYA_SEALED_NODE_URL ?? "http://127.0.0.1:7800",
  );
  const requestTimeoutMs = config.requestTimeoutMs ?? Number(process.env.VEYA_SDK_TIMEOUT_MS ?? 15_000);
  if (!Number.isFinite(requestTimeoutMs) || requestTimeoutMs < 1_000) {
    throw new VeyaSdkError("INVALID_CONFIG", "requestTimeoutMs must be >= 1000");
  }

  return {
    rpcUrl,
    contractAddress,
    chainId,
    explorerUrl,
    payerPrivateKey: parsePrivateKey(
      config.payerPrivateKey ?? process.env.VEYA_DEPLOYER_PRIVATE_KEY,
    ),
    validatorNodes: config.validatorNodes ?? parseNodeList(process.env.VEYA_VALIDATOR_NODES, DEFAULT_VALIDATORS),
    sealedNodeUrl,
    requestTimeoutMs,
  };
}

export function describeConfig(config: ResolvedVeyaConfig): Record<string, unknown> {
  return {
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
