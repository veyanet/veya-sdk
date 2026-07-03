/**
 * BLAKE3-256 commitment hashing — used for all VEYA digests that land on
 * Veya.sol as bytes32. Browser Use-mode content proofs on the hosted API
 * stay SHA-256 on purpose so a human can preview a hash without WASM PQ;
 * SDK and validator paths are BLAKE3 only.
 */

import { createBLAKE3 } from "hash-wasm";
import { VeyaSdkError } from "../errors/veya-error.js";
import { utf8Bytes } from "../encoding/bytes.js";

export const BLAKE3_DIGEST_BYTES = 32;
export const BLAKE3_DIGEST_HEX_LENGTH = 64;

export function isBlake3Hex(value: string): boolean {
  return /^[0-9a-f]{64}$/i.test(value.replace(/^0x/, ""));
}

export function normalizeBlake3Hex(value: string): string {
  const hex = value.replace(/^0x/, "").toLowerCase();
  if (!isBlake3Hex(hex)) {
    throw new VeyaSdkError("INVALID_HEX", "BLAKE3 digest must be 64 hex characters", { value });
  }
  return hex;
}

export async function hashBlake3(data: Uint8Array | string): Promise<string> {
  if (typeof data === "string" && data.length === 0) {
    throw new VeyaSdkError("INVALID_HEX", "hashBlake3 refuses empty string — hash an explicit payload");
  }
  if (data instanceof Uint8Array && data.length === 0) {
    throw new VeyaSdkError("INVALID_HEX", "hashBlake3 refuses empty bytes — hash an explicit payload");
  }
  const hasher = await createBLAKE3();
  hasher.init();
  hasher.update(data);
  const hex = hasher.digest("hex");
  return normalizeBlake3Hex(hex);
}

export async function hashBlake3Bytes(data: Uint8Array | string): Promise<Uint8Array> {
  const hex = await hashBlake3(data);
  return Uint8Array.from(Buffer.from(hex, "hex"));
}

export async function hashBlake3Concat(parts: Array<Uint8Array | string>): Promise<string> {
  const hasher = await createBLAKE3();
  hasher.init();
  for (const part of parts) {
    hasher.update(typeof part === "string" ? utf8Bytes(part) : part);
  }
  return normalizeBlake3Hex(hasher.digest("hex"));
}

export async function hashJsonCanonical(value: unknown): Promise<string> {
  return hashBlake3(JSON.stringify(value));
}

export function blake3Uri(hex: string): string {
  return `veya://blake3/${normalizeBlake3Hex(hex)}`;
}

export function contentUri(hex: string): string {
  return `veya://${normalizeBlake3Hex(hex)}`;
}

export function assertBlake3Hex(value: string, label = "digest"): string {
  return normalizeBlake3Hex(value);
}

export const EMPTY_PAYLOAD_REFUSED = "hashBlake3 refuses empty payload";
