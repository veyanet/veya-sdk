import { describe, it, expect } from "vitest";
import { Veya } from "../src/client/VeyaClient.js";
describe("Veya client", () => {
  it("constructs resource helpers", () => {
    const veya = new Veya({ apiUrl: "https://api.veyanet.tech", apiKey: "vya_dev_test" });
    expect(veya.environments).toBeDefined();
  });
});
