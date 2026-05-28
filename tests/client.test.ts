import { describe, it, expect, vi, beforeEach } from "vitest";
import { Veya } from "../src/client/VeyaClient.js";
describe("Veya client", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, text: async () => JSON.stringify({ status: "ok" }) })));
  });
  it("constructs resource helpers", () => {
    const veya = new Veya({ apiUrl: "https://api.veyanet.tech", apiKey: "vya_dev_test" });
    expect(veya.environments).toBeDefined();
  });
});
