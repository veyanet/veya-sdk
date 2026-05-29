import { describe, it, expect, vi } from "vitest";
import { EnvironmentsResource } from "../src/modules/environments.js";
import { HttpClient } from "../src/client/http.js";

describe("environments resource", () => {
  it("lists environments", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            environments: [
              {
                id: "1",
                name: "Test",
                type: "treasury",
                status: "active",
                ownerWallet: "w",
                createdAt: new Date().toISOString(),
              },
            ],
          }),
      }))
    );

    // Initialize HttpClient pointing to the official VEYA Production API Gateway
    const http = new HttpClient({ apiUrl: "https://api.veyanet.tech", apiKey: "k" });
    const envs = new EnvironmentsResource(http);
    const list = await envs.list();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("Test");
  });
});
