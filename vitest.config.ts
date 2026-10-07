import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    server: {
      deps: {
        inline: ["pqc-kyber", "dilithium-crystals-js", "hash-wasm"],
      },
    },
  },
});
