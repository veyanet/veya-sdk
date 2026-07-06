/**
 * Post-quantum surface for @veya/sdk.
 *
 * Algorithm profile (must match Rust validator-node / sealed-node):
 * - Identity: ML-DSA-44 (FIPS 204)
 * - Sessions: Kyber-768 / ML-KEM-768 (FIPS 203)
 * - Commitments: BLAKE3-256
 *
 * SHA-256 is not used on SDK commitment paths. The hosted Use-mode stamp
 * hashes content with SHA-256 so a browser can preview without WASM; that
 * split is documented in docs/POST_QUANTUM.md and is not this module.
 */

export {
  generatePQIdentity,
  signPQ,
  verifyPQ,
  publicKeyHashBlake3,
  signUtf8,
  verifyUtf8,
  identityFingerprintHex,
  assertMlDsaPublicKey,
  assertMlDsaSecretKey,
  ML_DSA44_PUBLIC_KEY_BYTES,
  ML_DSA44_SECRET_KEY_BYTES,
  ML_DSA44_SIGNATURE_BYTES,
} from "./mldsa.js";
export type { PqIdentity } from "./mldsa.js";

export {
  generateKyberKeys,
  encapsulateKyber,
  decapsulateKyber,
  kyberPublicKeyHex,
  kyberCiphertextHex,
  parseKyberHex,
  assertKyberPublicKey,
  KYBER768_PUBLIC_KEY_BYTES,
  KYBER768_SECRET_KEY_BYTES,
  KYBER768_CIPHERTEXT_BYTES,
  KYBER768_SHARED_SECRET_BYTES,
} from "./kyber.js";
export type { KyberKeypair, KyberEncapsulation } from "./kyber.js";

export {
  hashBlake3,
  hashBlake3Bytes,
  hashBlake3Concat,
  hashJsonCanonical,
  blake3Uri,
  contentUri,
  isBlake3Hex,
  normalizeBlake3Hex,
  BLAKE3_DIGEST_BYTES,
  BLAKE3_DIGEST_HEX_LENGTH,
} from "./blake3.js";

export const PQ_PROFILE = {
  identity: "ML-DSA-44",
  kem: "Kyber-768",
  commitment: "BLAKE3-256",
  onChainVerifier: false,
  fips: { identity: "FIPS 204", kem: "FIPS 203" },
} as const;

export function describePqProfile(): string {
  return `${PQ_PROFILE.identity} + ${PQ_PROFILE.kem} + ${PQ_PROFILE.commitment}`;
}

export async function hashAndSign(
  message: Uint8Array,
  privateKey: Uint8Array,
): Promise<{ digest: string; signature: Uint8Array }> {
  const { hashBlake3 } = await import("./blake3.js");
  const { signPQ } = await import("./mldsa.js");
  const digest = await hashBlake3(message);
  const signature = await signPQ(message, privateKey);
  return { digest, signature };
}
