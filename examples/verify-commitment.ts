/**
 * Stranger path — no private key.
 * Hash locally, ping Robinhood testnet, verify a known commitment tx
 * via receipt parse + eth_call commitments(digest).
 *
 *   npx tsx examples/verify-commitment.ts [txHash]
 */

import {
  ROBINHOOD_TESTNET,
  SDK_SURFACE,
  VeyaClient,
} from "../src/index.js";

const TX =
  process.argv[2] ??
  "0xd68ab19671f0a3be63651cb6d6e24f5decf591da981708502827bca3689d31d8";

const client = new VeyaClient();

console.log("surface", SDK_SURFACE);
const ping = await client.pingChain();
const local = await client.hashBlake3(`verify-example ${Date.now()}`);
const { proofs, commitmentChecks } = await client.verifyCommitmentOnChain(TX);

console.log({
  chain: ROBINHOOD_TESTNET.name,
  chainId: ping.chainId.toString(),
  localBlake3: local,
  tx: TX,
  proofs,
  commitmentChecks,
  explorer: client.explorerFor(TX),
});

if (proofs.length === 0 || commitmentChecks.some((c) => !c.onChain)) {
  process.exitCode = 1;
  console.error("FAIL: could not prove commitment on chain");
} else {
  console.log("OK: stranger verified commitment without a wallet key");
}
