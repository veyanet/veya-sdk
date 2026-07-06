import { describe, expect, it } from "vitest";
import { hashBlake3, hashJsonCanonical, isBlake3Hex } from "./blake3.js";
import {
  generatePQIdentity,
  signPQ,
  verifyPQ,
  ML_DSA44_PUBLIC_KEY_BYTES,
} from "./mldsa.js";
import { generateKyberKeys, encapsulateKyber, decapsulateKyber } from "./kyber.js";
import { PQ_PROFILE } from "./index.js";

describe("post-quantum primitives", () => {
  it("BLAKE3 is deterministic", async () => {
    const a = await hashBlake3("veya");
    const b = await hashBlake3("veya");
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
    expect(isBlake3Hex(a)).toBe(true);
  });

  it("BLAKE3 of JSON is stable for the same object", async () => {
    const h = await hashJsonCanonical({ a: 1, b: "x" });
    expect(h).toBe(await hashJsonCanonical({ a: 1, b: "x" }));
  });

  it("ML-DSA sign/verify", async () => {
    const { publicKey, privateKey } = await generatePQIdentity();
    expect(publicKey.length).toBe(ML_DSA44_PUBLIC_KEY_BYTES);
    const msg = new TextEncoder().encode("attestation");
    const sig = await signPQ(msg, privateKey);
    expect(await verifyPQ(sig, msg, publicKey)).toBe(true);
    expect(await verifyPQ(sig, new TextEncoder().encode("other"), publicKey)).toBe(false);
  });

  it("Kyber-768 encapsulate/decapsulate round-trip", () => {
    const keys = generateKyberKeys();
    const { ciphertext, sharedSecret } = encapsulateKyber(keys.publicKey);
    const opened = decapsulateKyber(ciphertext, keys.privateKey);
    expect(Buffer.from(opened).toString("hex")).toBe(Buffer.from(sharedSecret).toString("hex"));
  });

  it("names the algorithm profile used on Robinhood Chain", () => {
    expect(PQ_PROFILE.identity).toBe("ML-DSA-44");
    expect(PQ_PROFILE.kem).toBe("Kyber-768");
    expect(PQ_PROFILE.commitment).toBe("BLAKE3-256");
    expect(PQ_PROFILE.onChainVerifier).toBe(false);
  });
});
