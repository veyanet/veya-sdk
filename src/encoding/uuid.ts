/**
 * Environment / agent identifiers as Veya.sol `bytes16`.
 *
 * The hosted API stores UUID strings. The contract stores 16 raw bytes.
 * RFC-4122 hyphenated form and 32-char hex both parse. Random UUIDs for
 * SDK-only flows come from `crypto.getRandomValues` — not from a clock
 * that an operator could collide across machines.
 */

import { VeyaSdkError } from "../errors/veya-error.js";
import { hexToBytes, bytesToHex, with0x } from "./bytes.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function randomUuidBytes(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}

export function uuidStringToBytes(uuid: string): Uint8Array {
  const trimmed = uuid.trim();
  if (UUID_RE.test(trimmed)) {
    return hexToBytes(trimmed.replace(/-/g, ""));
  }
  const hex = trimmed.replace(/^0x/i, "");
  if (/^[0-9a-f]{32}$/i.test(hex)) {
    return hexToBytes(hex);
  }
  throw new VeyaSdkError(
    "INVALID_UUID",
    "environment/agent id must be an RFC-4122 UUID or 16-byte hex",
    { uuid },
  );
}

export function uuidBytesToString(bytes: Uint8Array): string {
  if (bytes.length !== 16) {
    throw new VeyaSdkError("INVALID_UUID", "UUID bytes must be length 16", {
      length: bytes.length,
    });
  }
  const h = bytesToHex(bytes);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function uuidToBytes16Hex(uuid: string): `0x${string}` {
  const bytes = uuidStringToBytes(uuid);
  return with0x(bytesToHex(bytes));
}

export function isUuidString(value: string): boolean {
  try {
    uuidStringToBytes(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Default environment slot used by the hosted relayer when a content proof
 * is not bound to an operator environment. Matches https://api.veyanet.tech
 * `DEFAULT_ENVIRONMENT_UUID` (0x01 padded to 16 bytes).
 */
export const DEFAULT_ENVIRONMENT_UUID_HEX =
  "0x00000000000000000000000000000001" as const;

export function defaultEnvironmentUuidBytes(): Uint8Array {
  const out = new Uint8Array(16);
  out[15] = 1;
  return out;
}

export function assertUuidBytes(bytes: Uint8Array): Uint8Array {
  if (bytes.length !== 16) {
    throw new VeyaSdkError("INVALID_UUID", "expected 16-byte UUID", { length: bytes.length });
  }
  return bytes;
}

export function randomUuidString(): string {
  return uuidBytesToString(randomUuidBytes());
}
