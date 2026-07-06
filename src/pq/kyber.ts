/**
 * Kyber-768 (ML-KEM-768) — NIST FIPS 203.
 *
 * Used for agent-to-agent session transport. Shared secrets never go on
 * Robinhood Chain. Encapsulation targets the local node's Kyber public key
 * (see coordination/sessions.ts). Ciphertext is hex-encoded for JSON wires.
 */

import { ml_kem768 } from "@noble/post-quantum/ml-kem.js";
import { VeyaSdkError } from "../errors/veya-error.js";

/** ML-KEM-768 public key length (bytes). */
export const KYBER768_PUBLIC_KEY_BYTES = 1184;
/** ML-KEM-768 secret key length (bytes). */
export const KYBER768_SECRET_KEY_BYTES = 2400;
/** ML-KEM-768 ciphertext length (bytes). */
export const KYBER768_CIPHERTEXT_BYTES = 1088;
/** Shared secret length (bytes). */
export const KYBER768_SHARED_SECRET_BYTES = 32;

export type KyberKeypair = {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
};

export type KyberEncapsulation = {
  ciphertext: Uint8Array;
  sharedSecret: Uint8Array;
};

export function assertKyberPublicKey(publicKey: Uint8Array): Uint8Array {
  if (publicKey.length !== KYBER768_PUBLIC_KEY_BYTES) {
    throw new VeyaSdkError("INVALID_CONFIG", "Kyber-768 public key has unexpected length", {
      expected: KYBER768_PUBLIC_KEY_BYTES,
      actual: publicKey.length,
    });
  }
  return publicKey;
}

export function generateKyberKeys(): KyberKeypair {
  const { publicKey, secretKey } = ml_kem768.keygen();
  if (!publicKey || !secretKey) {
    throw new VeyaSdkError("INVALID_CONFIG", "Kyber-768 keygen returned empty material");
  }
  return { publicKey, privateKey: secretKey };
}

export function encapsulateKyber(publicKey: Uint8Array): KyberEncapsulation {
  assertKyberPublicKey(publicKey);
  const { cipherText, sharedSecret } = ml_kem768.encapsulate(publicKey);
  return { ciphertext: cipherText, sharedSecret };
}

export function decapsulateKyber(ciphertext: Uint8Array, privateKey: Uint8Array): Uint8Array {
  if (ciphertext.length !== KYBER768_CIPHERTEXT_BYTES) {
    throw new VeyaSdkError("INVALID_CONFIG", "Kyber-768 ciphertext has unexpected length", {
      expected: KYBER768_CIPHERTEXT_BYTES,
      actual: ciphertext.length,
    });
  }
  if (privateKey.length !== KYBER768_SECRET_KEY_BYTES) {
    throw new VeyaSdkError("INVALID_CONFIG", "Kyber-768 secret key has unexpected length", {
      expected: KYBER768_SECRET_KEY_BYTES,
      actual: privateKey.length,
    });
  }
  return ml_kem768.decapsulate(ciphertext, privateKey);
}

export function kyberPublicKeyHex(publicKey: Uint8Array): string {
  return Buffer.from(assertKyberPublicKey(publicKey)).toString("hex");
}

export function kyberCiphertextHex(ciphertext: Uint8Array): string {
  return Buffer.from(ciphertext).toString("hex");
}

export function parseKyberHex(hex: string, expectedLength: number, label: string): Uint8Array {
  const bytes = Uint8Array.from(Buffer.from(hex.replace(/^0x/, ""), "hex"));
  if (bytes.length !== expectedLength) {
    throw new VeyaSdkError("INVALID_HEX", `${label} hex decoded to unexpected length`, {
      expectedLength,
      actual: bytes.length,
    });
  }
  return bytes;
}

export function describeKyberSizes(): Record<string, number> {
  return {
    publicKey: KYBER768_PUBLIC_KEY_BYTES,
    secretKey: KYBER768_SECRET_KEY_BYTES,
    ciphertext: KYBER768_CIPHERTEXT_BYTES,
    sharedSecret: KYBER768_SHARED_SECRET_BYTES,
  };
}
