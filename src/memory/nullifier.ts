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
import { entryKey, loadStore, requireOwnerScope, saveStore } from "./store.js";

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
  ownerScope: string,
): Promise<MemoryEntry> {
  const scope = requireOwnerScope(ownerScope);
  if (!data) {
    throw new VeyaSdkError("INVALID_CONFIG", "memory data must be a non-empty string");
  }
  const store = loadStore(scope);
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
  saveStore(store, scope);
  return entry;
}

export async function readMemory(environmentId: string, id: string, ownerScope: string): Promise<MemoryEntry> {
  const store = loadStore(ownerScope);
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

export function invalidateMemory(environmentId: string, id: string, ownerScope: string): void {
  const scope = requireOwnerScope(ownerScope);
  const store = loadStore(scope);
  const entry = store.entries[entryKey(environmentId, id)];
  if (!entry) throw new VeyaSdkError("MEMORY_MISSING", "memory not found", { environmentId, id });
  entry.nullified = true;
  saveStore(store, scope);
}

export function listMemory(environmentId: string, ownerScope: string): MemoryEntry[] {
  const store = loadStore(ownerScope);
  return Object.values(store.entries).filter((e) => e.environmentId === environmentId);
}

export function listActiveMemory(environmentId: string, ownerScope: string): MemoryEntry[] {
  return listMemory(environmentId, ownerScope).filter((e) => !e.nullified);
}

export async function getMemoryHash(environmentId: string, id: string, ownerScope: string): Promise<string> {
  const entry = await readMemory(environmentId, id, ownerScope);
  return entry.blake3ContentHash;
}

export function memoryExists(environmentId: string, id: string, ownerScope: string): boolean {
  const store = loadStore(ownerScope);
  return Boolean(store.entries[entryKey(environmentId, id)]);
}
