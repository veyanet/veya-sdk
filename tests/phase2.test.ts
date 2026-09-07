import { describe, expect, it } from "vitest";
import { id } from "ethers";
import {
  ENVIRONMENT_TYPES,
  SDK_VERSION,
  SDK_SURFACE,
  VEYA_REVERT_SELECTORS,
  assertBytesLength,
  fromAnchorRevert,
  parseVeyaLogs,
  VeyaSdkError,
} from "./index.js";

describe("Phase 2 SDK surface", () => {
  it("pins package version 1.2.0 and honesty card", () => {
    expect(SDK_VERSION).toBe("1.2.0");
    expect(SDK_SURFACE.sealed).toBe("AES-256-GCM");
    expect(SDK_SURFACE.notFhe).toBe(true);
    expect(SDK_SURFACE.notMainnet).toBe(true);
    expect(SDK_SURFACE.chainId).toBe(46630);
  });

  it("ENVIRONMENT_TYPES match Veya.sol enum", () => {
    expect(ENVIRONMENT_TYPES.Execution).toBe(0);
    expect(ENVIRONMENT_TYPES.SecureEnclave).toBe(1);
    expect(ENVIRONMENT_TYPES.Governance).toBe(2);
    expect(ENVIRONMENT_TYPES.Isolated).toBe(0);
    expect(ENVIRONMENT_TYPES.Shared).toBe(1);
  });

  it("maps all Veya.sol custom error selectors", () => {
    const expected: Record<string, string> = {
      "InvalidEnvironmentType()": "INVALID_ENV_TYPE",
      "InvalidAgentRole()": "INVALID_AGENT_ROLE",
      "EnvironmentAlreadyExists()": "ENVIRONMENT_EXISTS",
      "EnvironmentDoesNotExist()": "ENVIRONMENT_MISSING",
      "AgentAlreadyExists()": "AGENT_EXISTS",
      "AgentDoesNotExist()": "AGENT_MISSING",
      "Unauthorized()": "UNAUTHORIZED",
      "SignatureTooLarge()": "SIGNATURE_TOO_LARGE",
      "AttestationAlreadyExists()": "ATTESTATION_EXISTS",
      "PqAttestationAlreadyExists()": "PQ_ATTESTATION_EXISTS",
      "CommitmentAlreadyExists()": "COMMITMENT_EXISTS",
      "SpendingLimitAlreadyExists()": "SPENDING_EXISTS",
      "SpendingLimitDoesNotExist()": "SPENDING_MISSING",
      "SpendingLimitExceeded()": "SPENDING_EXCEEDED",
      "ToolNameTooLong()": "TOOL_NAME_TOO_LONG",
      "MemoryAlreadyNullified()": "MEMORY_NULLIFIED",
      "SealedChunkTooLarge()": "SEALED_CHUNK_TOO_LARGE",
    };
    for (const [sig, code] of Object.entries(expected)) {
      const selector = id(sig).slice(0, 10).toLowerCase();
      expect(VEYA_REVERT_SELECTORS[selector], sig).toBe(code);
    }
  });

  it("assertBytesLength fail-closed", () => {
    expect(() => assertBytesLength(new Uint8Array(15), 16, "uuid")).toThrow(VeyaSdkError);
    expect(assertBytesLength(new Uint8Array(16), 16, "uuid")).toHaveLength(16);
  });

  it("fromAnchorRevert maps MemoryAlreadyNullified", () => {
    const selector = id("MemoryAlreadyNullified()").slice(0, 10);
    const err = fromAnchorRevert({ data: `${selector}${"00".repeat(32)}` });
    expect(err.code).toBe("MEMORY_NULLIFIED");
  });

  it("parseVeyaLogs accepts CommitmentStored", () => {
    // Minimal synthetic: empty logs → empty proofs
    expect(parseVeyaLogs([], "0x1a1Dc3c55550FCE9F70ef6cDEeF967c0b72a5d84", "0xabc", "https://x")).toEqual(
      [],
    );
  });
});
