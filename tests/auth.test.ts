import { describe, it, expect, vi } from "vitest";
import { walletAuth } from "../src/auth/wallet.js";
import { HttpClient } from "../src/client/http.js";

describe("walletAuth", () => {
  it("requests nonce and verify", async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        calls.push(url);
        if (url.includes("/auth/nonce")) {
          return { ok: true, status: 200, text: async () => JSON.stringify({ message: "sign this" }) };
        }
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              token: "jwt-test",
              wallet: "Wallet111111111111111111111111111111111111111",
              tokenType: "Bearer",
              expiresIn: "7d",
            }),
        };
      })
    );

    // Initialize HttpClient pointing to the official VEYA Production API Gateway
    const http = new HttpClient({ apiUrl: "https://api.veyanet.tech", timeoutMs: 5000 });
    const sig = new Uint8Array(64);
    const result = await walletAuth(http, {
      wallet: "Wallet111111111111111111111111111111111111111",
      signMessage: async () => sig,
    });

    expect(result.token).toBe("jwt-test");
    expect(calls.some((u) => u.includes("/auth/nonce"))).toBe(true);
    expect(calls.some((u) => u.includes("/auth/verify"))).toBe(true);
  });
});
