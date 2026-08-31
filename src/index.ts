/**
 * VEYA Post-Quantum SDK — Robinhood Chain
 *
 * TypeScript SDK for bounded agent infra: environments, sealed execution,
 * 2-of-3 validator consensus, and Veya.sol settlement on Robinhood Chain.
 * Commitments use BLAKE3. Identities use ML-DSA-44. Coordination sessions
 * use Kyber-768 KEM.
 */

export const SDK_NAME = "@veyanet/sdk";
export const SDK_VERSION = "1.0.0";

/** What this package is, in one object operators can log from doctor scripts. */
export const SDK_SURFACE = {
  name: SDK_NAME,
  version: SDK_VERSION,
  chain: "Robinhood Chain",
  chainId: 46630,
  contract: "Veya.sol",
  identity: "ML-DSA-44",
  kem: "Kyber-768",
  commitment: "BLAKE3-256",
} as const;

export { VeyaClient } from "./client/VeyaClient.js";
export type { VeyaClientConfig, ResolvedVeyaConfig } from "./config.js";
export { resolveConfig, describeConfig } from "./config.js";

export {
  ROBINHOOD_TESTNET,
  ROBINHOOD_TESTNET_CHAIN_ID,
  explorerTxUrl,
  explorerAddressUrl,
  explorerContractUrl,
  isRobinhoodTestnet,
  walletAddChainParams,
  pingRpc,
} from "./chain.js";
export type { RobinhoodNetwork } from "./chain.js";

export { VEYA_ABI, VEYA_BYTECODE, VEYA_PROTOCOL_CONTRACT_ADDRESS, VEYA_CONTRACT_ADDRESS, abiFunctionNames, abiEventNames, abiErrorNames } from "./abi/index.js";

export * as pq from "./pq/index.js";
export * from "./sealed/index.js";
export * from "./compute/consensus.js";
export * from "./coordination/router.js";
export * from "./coordination/sessions.js";
export * from "./coordination/policyAgent.js";
export * from "./memory/nullifier.js";
export * from "./spending/limits.js";
export { EvmAnchor } from "./client/evm.js";
export { parseVeyaLogs, parseProofFromTransaction } from "./client/receipts.js";
export type { ParsedVeyaProof } from "./client/receipts.js";
export * from "./program/instructions.js";
export {
  VeyaSdkError,
  isVeyaSdkError,
  fromAnchorRevert,
  VEYA_ERROR_CODES,
  VEYA_REVERT_SELECTORS,
} from "./errors/veya-error.js";
export type { VeyaErrorCode } from "./errors/veya-error.js";
export { uuidStringToBytes, uuidBytesToString, randomUuidBytes } from "./encoding/uuid.js";
export { setLogSink, resetLogSink, stderrJsonSink } from "./observability/log.js";
