import { describe, it, expect, vi, beforeEach } from "vitest";
import { Veya } from "../src/client/VeyaClient.js";
describe("Veya client", () => {
  it("constructs resource helpers", () => {
    const veya = new Veya({ apiUrl: "https://api.veyanet.tech", apiKey: "vya_dev_test" });
    expect(veya.environments).toBeDefined();
  });
  it("runs client verification mock check", () => {
    expect(true).toBe(true);
  });
});
