import { describe, it, expect, vi } from "vitest";
import { Veya } from "../src/client/VeyaClient.js";

describe("proofs resource", () => {
  it("verify uses public route", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            valid: true,
            signature: "a".repeat(88),
            hash: "b".repeat(64),
            uri: `veya://${"b".repeat(64)}`,
            slot: 1,
            blockTime: 1,
            cluster: "devnet",
            explorerUrl: "https://solscan.io/tx/test",
            registered: null,
          }),
      }))
    );

    // Initialize pointing to the official VEYA Production API Gateway
    const veya = new Veya({ apiUrl: "https://api.veyanet.tech", apiKey: "k" });
    const v = await veya.proofs.verifyTransaction("sig");
    expect(v.valid).toBe(true);
    const [url] = vi.mocked(fetch).mock.calls[0] as [string];
    expect(url).toContain("/api/verify/");
  });
});
