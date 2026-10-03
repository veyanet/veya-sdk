/**
 * Local JSON store for agent memory entries.
 *
 * A call with no owner scope throws and does not touch ~/.veya/agent-memory.json.
 * An explicit scope writes ~/.veya/scopes/<sha256>/agent-memory.json.
 * This file is operator-local, not the product database.
 */

import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { VeyaSdkError } from "../errors/veya-error.js";

export const MEMORY_DIR = path.join(os.homedir(), ".veya");
export const MEMORY_FILE = path.join(MEMORY_DIR, "agent-memory.json");

export function requireOwnerScope(ownerScope: string | undefined | null): string {
  const scope = ownerScope?.trim() ?? "";
  if (!scope) {
    throw new VeyaSdkError("INVALID_CONFIG", "owner scope is required");
  }
  return scope;
}

export function scopedMemoryFile(ownerScope: string): string {
  const scope = requireOwnerScope(ownerScope);
  const digest = createHash("sha256").update(scope).digest("hex");
  return path.join(MEMORY_DIR, "scopes", digest, "agent-memory.json");
}

export type StoreFile = {
  entries: Record<string, import("./nullifier.js").MemoryEntry>;
  policies: Record<string, string[]>;
};

export function emptyStore(): StoreFile {
  return { entries: {}, policies: {} };
}

export function loadStore(ownerScope: string): StoreFile {
  const file = scopedMemoryFile(ownerScope);
  try {
    if (fs.existsSync(file)) {
      const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as StoreFile;
      if (!parsed.entries || typeof parsed.entries !== "object") return emptyStore();
      if (!parsed.policies || typeof parsed.policies !== "object") parsed.policies = {};
      return parsed;
    }
  } catch (err) {
    if (err instanceof VeyaSdkError) throw err;
    return emptyStore();
  }
  return emptyStore();
}

export function saveStore(store: StoreFile, ownerScope: string): void {
  const file = scopedMemoryFile(ownerScope);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2));
  fs.renameSync(tmp, file);
}

export function entryKey(environmentId: string, id: string): string {
  if (!environmentId || !id) {
    throw new VeyaSdkError("INVALID_CONFIG", "memory entryKey requires environmentId and id");
  }
  return `${environmentId}:${id}`;
}

export function memoryStats(ownerScope: string, store: StoreFile = loadStore(ownerScope)): {
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

export function setStoredPolicy(environmentId: string, tools: string[], ownerScope: string): void {
  const store = loadStore(ownerScope);
  store.policies[environmentId] = [...tools];
  saveStore(store, ownerScope);
}

export function getStoredPolicy(environmentId: string, ownerScope: string): string[] {
  return loadStore(ownerScope).policies[environmentId] ?? [];
}

export { MEMORY_FILE as defaultMemoryFile };
