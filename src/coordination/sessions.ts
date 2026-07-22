/**
 * Kyber-768 session cache for MCP coordination transport.
 *
 * Shared secrets never go on Robinhood Chain. Session IDs are BLAKE3 of the
 * agent pair plus a timestamp. The encapsulating public key is this process's
 * node key — operators who need durable identity should persist that key
 * outside this Map (it is process-local by design).
 */

import { encapsulateKyber, generateKyberKeys } from "../pq/kyber.js";
import { hashBlake3 } from "../pq/blake3.js";
import { VeyaSdkError } from "../errors/veya-error.js";

export type KyberSession = {
  sessionId: string;
  ciphertext: string;
  sharedSecretHex: string;
  createdAt: number;
  fromAgent: string;
  toAgent: string;
};

export const KYBER_SESSION_TTL_MS = 60 * 60 * 1000;

const nodeKeys = generateKyberKeys();
const sessions = new Map<string, KyberSession>();

export function getNodeKyberPublicKey(): Uint8Array {
  return nodeKeys.publicKey;
}

export function getNodeKyberPublicKeyHex(): string {
  return Buffer.from(nodeKeys.publicKey).toString("hex");
}

function purgeExpired(now = Date.now()): void {
  for (const [id, session] of sessions) {
    if (now - session.createdAt > KYBER_SESSION_TTL_MS) sessions.delete(id);
  }
}

export async function establishKyberSession(
  fromAgent: string,
  toAgent: string,
): Promise<KyberSession> {
  if (!fromAgent.trim() || !toAgent.trim()) {
    throw new VeyaSdkError("INVALID_CONFIG", "Kyber session requires fromAgent and toAgent");
  }
  purgeExpired();
  const sessionId = await hashBlake3(`${fromAgent}:${toAgent}:${Date.now()}`);
  const { ciphertext, sharedSecret } = encapsulateKyber(nodeKeys.publicKey);
  const session: KyberSession = {
    sessionId,
    ciphertext: Buffer.from(ciphertext).toString("hex"),
    sharedSecretHex: Buffer.from(sharedSecret).toString("hex"),
    createdAt: Date.now(),
    fromAgent,
    toAgent,
  };
  sessions.set(sessionId, session);
  return session;
}

export function getKyberSession(sessionId: string): KyberSession | undefined {
  purgeExpired();
  return sessions.get(sessionId);
}

export function requireKyberSession(sessionId: string): KyberSession {
  const session = getKyberSession(sessionId);
  if (!session) {
    throw new VeyaSdkError("INVALID_CONFIG", "Kyber session not found or expired", { sessionId });
  }
  return session;
}

export function listKyberSessions(): KyberSession[] {
  purgeExpired();
  return [...sessions.values()].sort((a, b) => b.createdAt - a.createdAt);
}

export function clearKyberSessions(): void {
  sessions.clear();
}

export function kyberSessionCount(): number {
  purgeExpired();
  return sessions.size;
}
