import { createHash, webcrypto } from "node:crypto";

const subtle = webcrypto.subtle;

export async function sha256Hex(input: string): Promise<string> {
  const buf = await subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Buffer.from(buf).toString("hex");
}

export function sha256HexSync(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}
