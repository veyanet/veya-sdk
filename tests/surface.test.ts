import { describe, expect, it } from "vitest";
import { id } from "ethers";
import {
  ENVIRONMENT_TYPES,
  SDK_VERSION,
  SDK_SURFACE,
  VEYA_REVERT_SELECTORS,
  fromAnchorRevert,
  parseVeyaLogs,
  proveInput,
  canonicalJson,
} from "../src/index.js";

describe("SDK surface", () => {
  it("pins package version 1.2.11 and honesty card", () => {
    expect(SDK_VERSION).toBe("1.2.11");
    expect(SDK_SURFACE.sealed).toBe("AES-256-GCM");
    expect(SDK_SURFACE.sealed).toBe("AES-256-GCM");
    expect(SDK_SURFACE.settlement).toBe("mainnet");
    expect(SDK_SURFACE.chainId).toBe(4663);
  });

  it("ENVIRONMENT_TYPES match the current Veya.sol labels", () => {
    expect(ENVIRONMENT_TYPES.Isolated).toBe(0);
    expect(ENVIRONMENT_TYPES.Shared).toBe(1);
    expect(ENVIRONMENT_TYPES.Governance).toBe(2);
  });

  it("maps the Veya.sol custom errors this package handles", () => {
    const expected: Record<string, string> = {
      "CommitmentAlreadyExists()": "COMMITMENT_EXISTS",
      "EnvironmentAlreadyExists()": "ENVIRONMENT_EXISTS",
      "EnvironmentDoesNotExist()": "ENVIRONMENT_MISSING",
      "AttestationAlreadyExists()": "ATTESTATION_EXISTS",
      "PqAttestationAlreadyExists()": "PQ_ATTESTATION_EXISTS",
      "SpendingLimitExceeded()": "SPENDING_EXCEEDED",
    };
    for (const [sig, code] of Object.entries(expected)) {
      const selector = id(sig).slice(0, 10).toLowerCase();
      expect(VEYA_REVERT_SELECTORS[selector], sig).toBe(code);
    }
  });

  it("maps ENVIRONMENT_MISSING from an estimateGas message", () => {
    const err = new Error(
      'execution reverted (unknown custom error) (action="estimateGas", data="0xb90193fa")',
    );
    const mapped = fromAnchorRevert(err, "mainnet");
    expect(mapped.code).toBe("ENVIRONMENT_MISSING");
    expect(mapped.message).toBe(
      "This environment is not registered on the selected network. Nothing was sent.",
    );
  });

  it("fromAnchorRevert leaves an unmapped selector as ANCHOR_REVERT", () => {
    const selector = id("MemoryAlreadyNullified()").slice(0, 10);
    const err = fromAnchorRevert({ data: `${selector}${"00".repeat(32)}` });
    expect(err.code).toBe("ANCHOR_REVERT");
  });

  it("parseVeyaLogs accepts CommitmentStored", () => {
    expect(parseVeyaLogs([], "0x1a1Dc3c55550FCE9F70ef6cDEeF967c0b72a5d84", "0xabc", "https://x")).toEqual(
      [],
    );
  });

  it("exports the proof entry", () => {
    expect(typeof proveInput).toBe("function");
    expect(canonicalJson({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });
});
