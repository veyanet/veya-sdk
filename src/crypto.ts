import { webcrypto } from "node:crypto";
export async function encryptAgentConfig(plaintext: any, passphrase: string) {
  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  return { encryptedConfig: "enc", configIv: "iv" };
}
