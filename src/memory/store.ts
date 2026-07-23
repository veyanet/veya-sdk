/**
 * Local JSON store for agent memory entries.
 *
 * Path: ~/.veya/agent-memory.json. This is operator-local, not a hosted
 * database and not on-chain. On-chain nullifiers (flagMemoryNullifier)
 * are a separate audit bit; this file holds the plaintext the agent reads.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeyaSdkError } from "../errors/veya-error.js";

export const MEMORY_DIR = path.join(os.homedir(), ".veya");
export const MEMORY_FILE = path.join(MEMORY_DIR, "agent-memory.json");

export type StoreFile = {
  entries: Record<string, import("./nullifier.js").MemoryEntry>;
  policies: Record<string, string[]>;
};

export function emptyStore(): StoreFile {
  return { entries: {}, policies: {} };
}

export function loadStore(): StoreFile {
  try {
    if (fs.existsSync(MEMORY_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(MEMORY_FILE, "utf8")) as StoreFile;
      if (!parsed.entries || typeof parsed.entries !== "object") return emptyStore();
      if (!parsed.policies || typeof parsed.policies !== "object") parsed.policies = {};
      return parsed;
    }
  } catch {
    return emptyStore();
  }
  return emptyStore();
}

export function saveStore(store: StoreFile): void {
  fs.mkdirSync(path.dirname(MEMORY_FILE), { recursive: true });
  const tmp = `${MEMORY_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2));
  fs.renameSync(tmp, MEMORY_FILE);
}

export function entryKey(environmentId: string, id: string): string {
  if (!environmentId || !id) {
    throw new VeyaSdkError("INVALID_CONFIG", "memory entryKey requires environmentId and id");
  }
  return `${environmentId}:${id}`;
}

export function memoryStats(store: StoreFile = loadStore()): {
  entries: number;
  nullified: number;
  environments: number;
} {
  const values = Object.values(store.entries);
  const envs = new Set(values.map((e) => e.environmentId));
  return {
    entries: values.length,
    nullified: values.filter((e) => e.nullified).length,
    environments: envs.size,
  };
}

export function setStoredPolicy(environmentId: string, tools: string[]): void {
  const store = loadStore();
  store.policies[environmentId] = [...tools];
  saveStore(store);
}

export function getStoredPolicy(environmentId: string): string[] {
  return loadStore().policies[environmentId] ?? [];
}

export { MEMORY_FILE as defaultMemoryFile };
