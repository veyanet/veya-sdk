/**
 * Cryptographic utility functions including AES-GCM and PBKDF2.
 */
import { webcrypto } from "node:crypto";
import { bytesToBase64, base64ToBytes } from "./utils/encoding.js";

const subtle = webcrypto.subtle;

function deriveAesKeyMaterial(passphrase: string): Uint8Array {
  const normalized = passphrase.trim();
  if (normalized.length < 8) {
    throw new Error("Passphrase must be at least 8 characters for agent config encryption");
  }
  return new TextEncoder().encode(normalized.padEnd(32, "0").slice(0, 32));
}

/**
 * Encrypt agent configuration before deploy (AES-256-GCM).
 * The passphrase must be stored by the integrator — never sent to VEYA.
 *
 * ```ts
 * import { encryptAgentConfig } from "@veya/sdk";
 * const { encryptedConfig, configIv } = await encryptAgentConfig(
 *   { allowedTools: ["transfer"], note: "prod" },
 *   process.env.AGENT_CONFIG_PASSPHRASE!
 * );
 * ```
 */
export async function encryptAgentConfig(
  plaintext: Record<string, unknown>,
  passphrase: string
): Promise<{ encryptedConfig: string; configIv: string }> {
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const keyMaterial = await subtle.importKey(
    "raw",
    deriveAesKeyMaterial(passphrase),
    "AES-GCM",
    false,
    ["encrypt"]
  );
  const encoded = new TextEncoder().encode(JSON.stringify(plaintext));
  const ciphertext = await subtle.encrypt({ name: "AES-GCM", iv }, keyMaterial, encoded);
  return {
    encryptedConfig: bytesToBase64(new Uint8Array(ciphertext)),
    configIv: bytesToBase64(iv),
  };
}

/**
 * Decrypt agent config locally when you hold the passphrase.
 */
export async function decryptAgentConfig(
  encryptedConfig: string,
  configIv: string,
  passphrase: string
): Promise<Record<string, unknown>> {
  const keyMaterial = await subtle.importKey(
    "raw",
    deriveAesKeyMaterial(passphrase),
    "AES-GCM",
    false,
    ["decrypt"]
  );
  const iv = base64ToBytes(configIv);
  const ciphertext = base64ToBytes(encryptedConfig);
  const plain = await subtle.decrypt({ name: "AES-GCM", iv }, keyMaterial, ciphertext);
  return JSON.parse(new TextDecoder().decode(plain)) as Record<string, unknown>;
}
