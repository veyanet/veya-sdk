/**
 * Sealed execution against local sealed-node (:7800).
 *
 *   npx tsx examples/sealed.ts
 */

import { VeyaClient } from "../src/index.js";

const client = new VeyaClient();
const entropy = crypto.getRandomValues(new Uint8Array(32));

try {
  const result = await client.protectedExecute({
    environmentId: "11111111-1111-4111-8111-111111111111",
    agentId: "22222222-2222-4222-8222-222222222222",
    eventType: "sdk.example.sealed",
    payload: { note: "robinhood sdk sealed example", at: new Date().toISOString() },
    sessionEntropy: entropy,
  });
  console.log({
    verified: result.verified,
    output: result.output_blake3_hash,
    commitment: result.sealed.blake3_commitment,
    signatureBytes: result.mldsa_signature.length / 2,
  });
} catch (err) {
  console.error("sealed-node did not run:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
}
