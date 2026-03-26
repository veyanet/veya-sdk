/** Base URL of the VEYA API (your hosted backend). */
export type VeyaConfig = {
  apiUrl: string;
  /** Bearer JWT from wallet sign-in, or use apiKey instead. */
  accessToken?: string;
  /** Server-side: `vya_dev_…` / `vya_live_…` */
  apiKey?: string;
  /** Default fetch timeout in ms. */
  timeoutMs?: number;
};

export const DEFAULT_API_URL = "https://api.veyanet.tech";

export function resolveConfig(input: Partial<VeyaConfig> = {}): VeyaConfig {
  const apiUrl = (input.apiUrl ?? process.env.VEYA_API_URL ?? DEFAULT_API_URL).replace(/\/$/, "");
  return {
    apiUrl,
    accessToken: input.accessToken,
    apiKey: input.apiKey,
    timeoutMs: input.timeoutMs ?? 30_000,
  };
}
