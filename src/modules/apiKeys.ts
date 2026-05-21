import type { HttpClient } from "../client/http.js";
import type { ApiKeyRow } from "../types/index.js";

export type CreateApiKeyInput = {
  name: string;
  tier: "dev" | "live";
  environmentId?: string;
};

export type CreateApiKeyResult = {
  apiKey: { id: string; key: string; prefix: string; tier: string };
  warning: string;
};

export class ApiKeysResource {
  constructor(private readonly http: HttpClient) {}

  async list(): Promise<ApiKeyRow[]> {
    const { apiKeys } = await this.http.request<{ apiKeys: ApiKeyRow[] }>("/v1/api-keys");
    return apiKeys;
  }

  /**
   * ```bash
   * # Create via SDK after wallet JWT:
   * # const { apiKey } = await veya.apiKeys.create({ name: "ci", tier: "dev" });
   * # Store apiKey.key once — it is not shown again.
   * ```
   */
  async create(input: CreateApiKeyInput): Promise<CreateApiKeyResult> {
    return this.http.request<CreateApiKeyResult>("/v1/api-keys", {
      method: "POST",
      body: input,
    });
  }

  async revoke(id: string): Promise<{ ok: boolean }> {
    return this.http.request<{ ok: boolean }>(`/v1/api-keys/${id}`, { method: "DELETE" });
  }
}
