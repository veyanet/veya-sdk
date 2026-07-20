/**
 * Response from the Rust `sealed-node` `/protected` handler.
 *
 * Ciphertext stays off-chain. The chain stores `blake3_commitment` via
 * storeSealedState when the operator asks for data availability. `verified`
 * is the node's own ML-DSA check over the execution hash — callers who need
 * independent verification should run pq.verifyPQ with the node pubkey.
 */

export type SealedPayload = {
  ciphertext: number[];
  blake3_commitment: string;
  context_label: string;
};

export type SealedExecResult = {
  sealed: SealedPayload;
  output_blake3_hash: string;
  mldsa_signature: string;
  verified: boolean;
};

export function isSealedPayload(value: unknown): value is SealedPayload {
  if (!value || typeof value !== "object") return false;
  const p = value as SealedPayload;
  return (
    Array.isArray(p.ciphertext) &&
    typeof p.blake3_commitment === "string" &&
    typeof p.context_label === "string"
  );
}

export function requireVerifiedSeal(result: SealedExecResult): SealedExecResult {
  if (!result.verified) {
    throw new Error("sealed-node reported verified=false — ciphertext or signature failed");
  }
  if (!/^[0-9a-f]{64}$/i.test(result.output_blake3_hash)) {
    throw new Error("sealed-node output_blake3_hash is not 32-byte hex");
  }
  return result;
}

export function commitmentHex(result: SealedExecResult): string {
  const c = result.sealed.blake3_commitment.replace(/^0x/, "").toLowerCase();
  if (c && /^[0-9a-f]{64}$/.test(c)) return c;
  return result.output_blake3_hash.replace(/^0x/, "").toLowerCase();
}

export const SEALED_CONTEXT_LABEL_PREFIX = "veya.sealed.";

export function defaultContextLabel(environmentId: string, eventType: string): string {
  return `${SEALED_CONTEXT_LABEL_PREFIX}${environmentId}.${eventType}`;
}

export type SealedExecRequest = {
  environmentId: string;
  agentId: string;
  eventType: string;
  payload: object;
  sessionEntropy: Uint8Array;
};
