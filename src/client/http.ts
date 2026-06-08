/**
 * Core HTTP network communication interface for Veya API.
 */
import { VeyaError } from "../errors/VeyaError.js";
import type { VeyaConfig } from "../config.js";

export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export type RequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  /** Public routes (e.g. verify) skip auth headers. */
  auth?: boolean;
};

export class HttpClient {
  constructor(private readonly config: VeyaConfig) {}

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = `${this.config.apiUrl}${path.startsWith("/") ? path : `/${path}`}`;
    const headers = new Headers({ Accept: "application/json" });
    if (options.body !== undefined) {
      headers.set("Content-Type", "application/json");
    }
    if (options.auth !== false) {
      if (this.config.apiKey) {
        headers.set("X-Api-Key", this.config.apiKey);
      } else if (this.config.accessToken) {
        headers.set("Authorization", `Bearer ${this.config.accessToken}`);
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs ?? 30_000);

    try {
      const res = await fetch(url, {
        method: options.method ?? "GET",
        headers,
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      const text = await res.text();
      let data: unknown = null;
      if (text) {
        try {
          data = JSON.parse(text) as unknown;
        } catch {
          data = text;
        }
      }

      if (!res.ok) {
        const err = data as { error?: string; code?: string };
        throw new VeyaError(err?.error ?? res.statusText, res.status, err?.code, data);
      }

      return data as T;
    } catch (err) {
      if (err instanceof VeyaError) throw err;
      if (err instanceof Error && err.name === "AbortError") {
        throw new VeyaError("Request timed out", 408);
      }
      throw new VeyaError(err instanceof Error ? err.message : "Network error", 0);
    } finally {
      clearTimeout(timeout);
    }
  }

  setAccessToken(token: string): void {
    this.config.accessToken = token;
    delete this.config.apiKey;
  }
}
