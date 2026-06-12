/**
 * @veya/sdk — official TypeScript client for the VEYA API.
 *
 * @packageDocumentation
 */

export { Veya } from "./client/VeyaClient.js";
export { VeyaError, isVeyaError, VeyaErrorCodes } from "./errors/index.js";
export { resolveConfig, DEFAULT_API_URL, type VeyaConfig } from "./config.js";
export { encryptAgentConfig } from "./crypto.js";
export { sha256Hex, sha256HexSync } from "./utils/hash.js";
export { walletAuth, type WalletAuthInput, type WalletSignMessage } from "./auth/wallet.js";
export {
  DecentralizedComputeResource,
  type DecentralizedNodeAttestation,
  type DecentralizedConsensus,
  type DecentralizedExecutionInput,
  type DecentralizedExecutionResult,
} from "./modules/compute.js";

export type * from "./types/index.js";
