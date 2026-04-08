import type { VeyaConfig } from "../config.js";

/**
 * Server-side integrators should pass the API key in the constructor:
 *
 * ```bash
 * export VEYA_API_KEY="vya_live_..."
 * export VEYA_API_URL="https://api.veyanet.tech"
 * ```
 *
 * ```ts
 * import { Veya } from "@veya/sdk";
 * const veya = new Veya({ apiKey: process.env.VEYA_API_KEY, apiUrl: process.env.VEYA_API_URL });
 * ```
 */
export function createClientConfigFromEnv(): Partial<VeyaConfig> {
  const apiKey = process.env.VEYA_API_KEY?.trim();
  const apiUrl = process.env.VEYA_API_URL?.trim();
  if (!apiKey) {
    throw new Error("VEYA_API_KEY is not set");
  }
  return { apiKey, apiUrl };
}

export type ApiKeyTier = "dev" | "live";

export function describeApiKeyTier(tier: ApiKeyTier): string {
  if (tier === "dev") {
    return "Development keys are rate-limited and intended for staging integrations.";
  }
  return "Live keys are for production traffic scoped to your account environments.";
}
