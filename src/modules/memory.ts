/**
 * Zero-knowledge scoped memory module endpoints.
 */
import type { HttpClient } from "../client/http.js";
import type { MemoryEntry } from "../types/index.js";
import { sha256Hex } from "../utils/hash.js";

export type StoreMemoryInput = {
  scope: string;
  contentHash: string;
  agentId?: string;
  metadata?: Record<string, unknown>;
};

export class MemoryResource {
  constructor(private readonly http: HttpClient) {}

  async list(environmentId: string, scope?: string): Promise<MemoryEntry[]> {
    const q = scope ? `?scope=${encodeURIComponent(scope)}` : "";
    const { memory } = await this.http.request<{ memory: MemoryEntry[] }>(
      `/v1/environments/${environmentId}/memory${q}`
    );
    return memory;
  }

  async store(environmentId: string, input: StoreMemoryInput): Promise<MemoryEntry> {
    const { memory } = await this.http.request<{ memory: MemoryEntry }>(
      `/v1/environments/${environmentId}/memory`,
      {
        method: "POST",
        body: { ...input, metadata: input.metadata ?? {} },
      }
    );
    return memory;
  }

  /**
   * Hash UTF-8 content and store under a scope.
   *
   * ```bash
   * # content never sent as plaintext to memory API — only hash + metadata
   * ```
   */
  async storeContent(
    environmentId: string,
    scope: string,
    content: string,
    options: { agentId?: string; metadata?: Record<string, unknown> } = {}
  ): Promise<MemoryEntry> {
    const contentHash = await sha256Hex(content);
    return this.store(environmentId, {
      scope,
      contentHash,
      agentId: options.agentId,
      metadata: options.metadata,
    });
  }

  async purge(environmentId: string, memoryId: string): Promise<{ ok: boolean }> {
    return this.http.request<{ ok: boolean }>(
      `/v1/environments/${environmentId}/memory/${memoryId}`,
      { method: "DELETE" }
    );
  }
}
