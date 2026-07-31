/**
 * Hash + (optional) 2-of-3 consensus against local validator nodes.
 *
 *   npx tsx examples/consensus.ts
 */

import { VeyaClient } from "../src/index.js";

const client = new VeyaClient();
const payload = {
  event: "sdk.example.consensus",
  recordedAt: new Date().toISOString(),
};
const digest = await client.hashBlake3(JSON.stringify(payload));
console.log({ localBlake3: digest, validators: client.config.validatorNodes });

try {
  const quorum = await client.runConsensus(`sdk-example-${Date.now()}`, payload);
  console.log({
    consensus_reached: quorum.consensus_reached,
    agreed: quorum.agreed_blake3_hash,
    reachable: quorum.reachable,
    threshold: quorum.threshold,
    nodes: quorum.node_results.map((n) => ({
      id: n.node_id,
      status: n.status,
      hash: n.blake3_execution_hash,
    })),
  });
} catch (err) {
  console.error("consensus did not complete:", err instanceof Error ? err.message : err);
  process.exitCode = 1;
}
