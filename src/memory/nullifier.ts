/**
 * Integrity-protected local memory with spend-once nullifiers.
 *
 * Content is hashed with BLAKE3 on write and re-hashed on read. A mismatch
 * is MEMORY_INTEGRITY — the file was edited outside the SDK. Nullify is
 * local; call EvmAnchor.flagMemoryNullifier if the operator also needs an
 * on-chain audit bit.
 */

import { hashBlake3 } from "../pq/blake3.js";
import { VeyaSdkError } from "../errors/veya-error.js";
import { entryKey, loadStore, saveStore } from "./store.js";

export type MemoryEntry = {
  id: string;
  environmentId: string;
  agentId: string;
  data: string;
  blake3ContentHash: string;
  nullified: boolean;
};

export async function storeMemory(
  environmentId: string,
  agentId: string,
  data: string,
): Promise<MemoryEntry> {
  if (!data) {
    throw new VeyaSdkError("INVALID_CONFIG", "memory data must be a non-empty string");
  }
  const store = loadStore();
  const id = crypto.randomUUID();
  const entry: MemoryEntry = {
    id,
    environmentId,
    agentId,
    data,
    blake3ContentHash: await hashBlake3(data),
    nullified: false,
  };
  store.entries[entryKey(environmentId, id)] = entry;
  saveStore(store);
  return entry;
}

export async function readMemory(environmentId: string, id: string): Promise<MemoryEntry> {
  const store = loadStore();
  const entry = store.entries[entryKey(environmentId, id)];
  if (!entry) throw new VeyaSdkError("MEMORY_MISSING", "memory not found", { environmentId, id });
  if (entry.nullified) {
    throw new VeyaSdkError("MEMORY_NULLIFIED", "memory nullified", { environmentId, id });
  }
  const hash = await hashBlake3(entry.data);
  if (hash !== entry.blake3ContentHash) {
    throw new VeyaSdkError("MEMORY_INTEGRITY", "memory integrity failed", {
      environmentId,
      id,
      expected: entry.blake3ContentHash,
      actual: hash,
    });
  }
  return entry;
}

export function invalidateMemory(environmentId: string, id: string): void {
  const store = loadStore();
  const entry = store.entries[entryKey(environmentId, id)];
  if (!entry) throw new VeyaSdkError("MEMORY_MISSING", "memory not found", { environmentId, id });
  entry.nullified = true;
  saveStore(store);
}

export function listMemory(environmentId: string): MemoryEntry[] {
  const store = loadStore();
  return Object.values(store.entries).filter((e) => e.environmentId === environmentId);
}

export function listActiveMemory(environmentId: string): MemoryEntry[] {
  return listMemory(environmentId).filter((e) => !e.nullified);
}

export async function getMemoryHash(environmentId: string, id: string): Promise<string> {
  const entry = await readMemory(environmentId, id);
  return entry.blake3ContentHash;
}

export function memoryExists(environmentId: string, id: string): boolean {
  const store = loadStore();
  return Boolean(store.entries[entryKey(environmentId, id)]);
}
