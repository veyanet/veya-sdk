/**
 * ML-DSA-44 — NIST FIPS 204 (Dilithium2 class).
 *
 * Matches Rust `pqcrypto-dilithium` dilithium2 used by validator-node and
 * sealed-node. Signatures are kilobytes; Veya.sol stores BLAKE3 of the
 * public key and optional signature bytes, not an on-chain verifier.
 */

import { ml_dsa44 } from "@noble/post-quantum/ml-dsa.js";
import { VeyaSdkError } from "../errors/veya-error.js";
import { hashBlake3 } from "./blake3.js";

/** FIPS 204 ML-DSA-44 public key length (bytes). */
export const ML_DSA44_PUBLIC_KEY_BYTES = 1312;
/** FIPS 204 ML-DSA-44 secret key length (bytes). */
export const ML_DSA44_SECRET_KEY_BYTES = 2560;
/** Typical signature length for ML-DSA-44 (bytes). */
export const ML_DSA44_SIGNATURE_BYTES = 2420;

export type PqIdentity = {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
};

export function assertMlDsaPublicKey(publicKey: Uint8Array): Uint8Array {
  if (publicKey.length !== ML_DSA44_PUBLIC_KEY_BYTES) {
    throw new VeyaSdkError("PQ_VERIFY_FAILED", "ML-DSA-44 public key has unexpected length", {
      expected: ML_DSA44_PUBLIC_KEY_BYTES,
      actual: publicKey.length,
    });
  }
  return publicKey;
}

export function assertMlDsaSecretKey(privateKey: Uint8Array): Uint8Array {
  if (privateKey.length !== ML_DSA44_SECRET_KEY_BYTES) {
    throw new VeyaSdkError("PQ_VERIFY_FAILED", "ML-DSA-44 secret key has unexpected length", {
      expected: ML_DSA44_SECRET_KEY_BYTES,
      actual: privateKey.length,
    });
  }
  return privateKey;
}

export async function generatePQIdentity(): Promise<PqIdentity> {
  const { publicKey, secretKey } = ml_dsa44.keygen();
  if (!publicKey || !secretKey) {
    throw new VeyaSdkError("PQ_VERIFY_FAILED", "ML-DSA-44 keygen returned empty material");
  }
  return { publicKey, privateKey: secretKey };
}

export async function signPQ(message: Uint8Array, privateKey: Uint8Array): Promise<Uint8Array> {
  if (!(message instanceof Uint8Array) || message.length === 0) {
    throw new VeyaSdkError("INVALID_HEX", "signPQ message must be a non-empty Uint8Array");
  }
  assertMlDsaSecretKey(privateKey);
  return ml_dsa44.sign(message, privateKey);
}

export async function verifyPQ(
  signature: Uint8Array,
  message: Uint8Array,
  publicKey: Uint8Array,
): Promise<boolean> {
  assertMlDsaPublicKey(publicKey);
  if (!(signature instanceof Uint8Array) || signature.length === 0) return false;
  try {
    return ml_dsa44.verify(signature, message, publicKey);
  } catch {
    return false;
  }
}

export async function publicKeyHashBlake3(publicKey: Uint8Array): Promise<string> {
  assertMlDsaPublicKey(publicKey);
  return hashBlake3(publicKey);
}

export async function signUtf8(message: string, privateKey: Uint8Array): Promise<string> {
  const sig = await signPQ(new TextEncoder().encode(message), privateKey);
  return Buffer.from(sig).toString("hex");
}

export async function verifyUtf8(
  signatureHex: string,
  message: string,
  publicKey: Uint8Array,
): Promise<boolean> {
  const sig = Uint8Array.from(Buffer.from(signatureHex, "hex"));
  return verifyPQ(sig, new TextEncoder().encode(message), publicKey);
}

export function identityFingerprintHex(hashHex: string): string {
  return hashHex.replace(/^0x/, "").toLowerCase().slice(0, 16);
}

export function describeMlDsaSizes(): Record<string, number> {
  return {
    publicKey: ML_DSA44_PUBLIC_KEY_BYTES,
    secretKey: ML_DSA44_SECRET_KEY_BYTES,
    signature: ML_DSA44_SIGNATURE_BYTES,
  };
}
