/**
 * Hex / bytes helpers used by EvmAnchor and commitment hashing.
 *
 * Veya.sol takes `bytes16` UUIDs and `bytes32` BLAKE3 digests. Callers often
 * hold UUID strings or 0x-prefixed hex. These helpers normalize once so
 * contract writes never send a 15-byte or 33-byte value that the ABI encoder
 * would silently pad the wrong way.
 */

import { VeyaSdkError } from "../errors/veya-error.js";

export function strip0x(hex: string): string {
  return hex.startsWith("0x") || hex.startsWith("0X") ? hex.slice(2) : hex;
}

export function with0x(hex: string): `0x${string}` {
  const body = strip0x(hex).toLowerCase();
  return `0x${body}`;
}

export function hexToBytes(hex: string): Uint8Array {
  const body = strip0x(hex);
  if (body.length % 2 !== 0) {
    throw new VeyaSdkError("INVALID_HEX", "hex string must have even length", { hex });
  }
  if (!/^[0-9a-fA-F]*$/.test(body)) {
    throw new VeyaSdkError("INVALID_HEX", "hex string contains non-hex characters", { hex });
  }
  const out = new Uint8Array(body.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(body.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function assertByteLength(bytes: Uint8Array, expected: number, label: string): Uint8Array {
  if (bytes.length !== expected) {
    throw new VeyaSdkError(
      "INVALID_HEX",
      `${label} must be ${expected} bytes, got ${bytes.length}`,
      { expected, actual: bytes.length },
    );
  }
  return bytes;
}

export function digestToBytes32(hex: string): Uint8Array {
  return assertByteLength(hexToBytes(hex), 32, "BLAKE3 digest");
}

export function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

export function utf8Bytes(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!;
  return diff === 0;
}

export function zeroPadBytes(bytes: Uint8Array, length: number): Uint8Array {
  if (bytes.length > length) {
    throw new VeyaSdkError("INVALID_HEX", "value longer than pad length", {
      length: bytes.length,
      pad: length,
    });
  }
  const out = new Uint8Array(length);
  out.set(bytes, length - bytes.length);
  return out;
}

export function isHexString(value: string): boolean {
  return /^(0x)?[0-9a-fA-F]+$/.test(value) && strip0x(value).length % 2 === 0;
}

export const BYTES16 = 16;
export const BYTES32 = 32;
