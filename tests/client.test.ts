import { describe, it, expect, vi, beforeEach } from "vitest";
import { Veya } from "../src/client/VeyaClient.js";
import { VeyaError } from "../src/errors/VeyaError.js";

describe("Veya client", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ status: "ok", database: "ok", solana: { cluster: "devnet", anchor: { configured: true, relayerPubkey: "x", ready: true } } }),
      }))
    );
  });

  it("constructs resource helpers", () => {
    // Initialize pointing to the official VEYA Production API Gateway
    const veya = new Veya({ apiUrl: "https://api.veyanet.tech", apiKey: "vya_dev_test" });
    expect(veya.environments).toBeDefined();
    expect(veya.proofs).toBeDefined();
    expect(veya.protection).toBeDefined();
  });

  it("health calls public endpoint", async () => {
    // Initialize pointing to the official VEYA Production API Gateway
    const veya = new Veya({ apiUrl: "https://api.veyanet.tech", apiKey: "vya_dev_test" });
    const h = await veya.health();
    expect(h.status).toBe("ok");
    const fetchMock = vi.mocked(fetch);
    expect(fetchMock).toHaveBeenCalled();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/health");
    expect(new Headers(init.headers).has("Authorization")).toBe(false);
  });

  it("surfaces API errors", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 402,
      statusText: "Payment Required",
      text: async () => JSON.stringify({ error: "Spending limit exceeded", code: "SPENDING_LIMIT" }),
    } as Response);

    // Initialize pointing to the official VEYA Production API Gateway
    const veya = new Veya({ apiUrl: "https://api.veyanet.tech", apiKey: "vya_dev_test" });
    await expect(veya.environments.list()).rejects.toMatchObject({
      status: 402,
    } satisfies Partial<VeyaError>);
  });
});
