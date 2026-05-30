import { describe, it, expect, vi } from "vitest";
import { ProtectionResource } from "../src/modules/protection.js";
import { HttpClient } from "../src/client/http.js";

describe("protection resource", () => {
  it("posts protected execution", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        const body = JSON.parse(init?.body as string);
        expect(body.sealFields).toContain("amount");
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              execution: {
                id: "ex-1",
                environmentId: "env",
                eventType: "test",
                payload: {},
                protected: true,
                spendLamports: "1000",
                createdAt: new Date().toISOString(),
              },
              attestationTx: "sig",
            }),
        };
      })
    );

    // Initialize HttpClient pointing to the official VEYA Production API Gateway
    const http = new HttpClient({ apiUrl: "https://api.veyanet.tech", apiKey: "k" });
    const p = new ProtectionResource(http);
    const result = await p.run("env-id", {
      agentId: "agent-id",
      eventType: "t",
      payload: { amount: 1 },
      discloseFields: [],
      sealFields: ["amount"],
      commitResult: true,
      spendLamports: 1000,
    });
    expect(result.attestationTx).toBe("sig");
  });
});
