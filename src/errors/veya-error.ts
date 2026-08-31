/**
 * Typed failures for @veyanet/sdk.
 *
 * Callers should branch on `code` rather than substring-matching Error.message.
 * Ethers custom errors from Veya.sol are mapped in `fromAnchorRevert` using
 * the 4-byte selector. Unknown selectors stay as `ANCHOR_REVERT` with the
 * raw data attached so operators can look them up without losing the receipt.
 */

export const VEYA_ERROR_CODES = [
  "CHAIN_MISMATCH",
  "RPC_UNREACHABLE",
  "MISSING_PAYER",
  "INVALID_HEX",
  "INVALID_UUID",
  "INVALID_ADDRESS",
  "INVALID_CONFIG",
  "CONSENSUS_UNREACHABLE",
  "CONSENSUS_NO_QUORUM",
  "SEALED_UNREACHABLE",
  "SEALED_REJECTED",
  "ANCHOR_REVERT",
  "COMMITMENT_EXISTS",
  "ENVIRONMENT_EXISTS",
  "ENVIRONMENT_MISSING",
  "ATTESTATION_EXISTS",
  "PQ_ATTESTATION_EXISTS",
  "SPENDING_EXCEEDED",
  "PQ_VERIFY_FAILED",
  "MEMORY_INTEGRITY",
  "MEMORY_NULLIFIED",
  "MEMORY_MISSING",
] as const;

export type VeyaErrorCode = (typeof VEYA_ERROR_CODES)[number];

/** Solidity custom-error selectors from Veya.sol (keccak of the signature). */
export const VEYA_REVERT_SELECTORS: Record<string, VeyaErrorCode> = {
  "0x145718a7": "COMMITMENT_EXISTS",
  "0xb6d54abb": "ENVIRONMENT_EXISTS",
  "0xb90193fa": "ENVIRONMENT_MISSING",
  "0x631ecd51": "ATTESTATION_EXISTS",
  "0x2d37333f": "PQ_ATTESTATION_EXISTS",
  "0x8a9e71ea": "SPENDING_EXCEEDED",
};

export class VeyaSdkError extends Error {
  readonly code: VeyaErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(code: VeyaErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "VeyaSdkError";
    this.code = code;
    this.details = details;
  }

  toJSON(): { name: string; code: VeyaErrorCode; message: string; details?: Record<string, unknown> } {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }
}

export function isVeyaSdkError(err: unknown): err is VeyaSdkError {
  return err instanceof VeyaSdkError;
}

function extractRevertData(err: unknown): string | undefined {
  if (!err || typeof err !== "object") return undefined;
  const anyErr = err as {
    data?: string;
    info?: { error?: { data?: string } };
    error?: { data?: string };
    shortMessage?: string;
  };
  const candidates = [anyErr.data, anyErr.info?.error?.data, anyErr.error?.data];
  for (const c of candidates) {
    if (typeof c === "string" && c.startsWith("0x") && c.length >= 10) return c;
  }
  return undefined;
}

/**
 * Map an ethers write failure onto a VeyaSdkError.
 * Pass-through if the value is already a VeyaSdkError.
 */
export function fromAnchorRevert(err: unknown): VeyaSdkError {
  if (isVeyaSdkError(err)) return err;
  const data = extractRevertData(err);
  const selector = data ? data.slice(0, 10).toLowerCase() : undefined;
  const mapped = selector ? VEYA_REVERT_SELECTORS[selector] : undefined;
  const rawMessage = err instanceof Error ? err.message : String(err);

  if (mapped === "COMMITMENT_EXISTS") {
    return new VeyaSdkError(
      mapped,
      "Commitment already anchored on Veya.sol — the same 32-byte digest cannot be stored twice",
      { selector, data },
    );
  }
  if (mapped) {
    return new VeyaSdkError(mapped, rawMessage, { selector, data });
  }
  return new VeyaSdkError("ANCHOR_REVERT", rawMessage, { selector, data });
}

export function assertHex32(value: string, label: string): string {
  const normalized = value.toLowerCase().replace(/^0x/, "");
  if (!/^[0-9a-f]{64}$/.test(normalized)) {
    throw new VeyaSdkError("INVALID_HEX", `${label} must be 32 bytes (64 hex chars)`, { value });
  }
  return normalized;
}

export function assertHexAddress(value: string, label = "address"): string {
  if (!/^0x[0-9a-fA-F]{40}$/.test(value)) {
    throw new VeyaSdkError("INVALID_ADDRESS", `${label} must be a 20-byte 0x-prefixed address`, {
      value,
    });
  }
  return value;
}
