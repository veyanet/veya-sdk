/**
 * Live RPC probe — fetch a Veya.sol tx, parse logs, eth_call commitments().
 *
 *   npx tsx scripts/live-rpc.ts [txHash]
 */

import { ROBINHOOD_TESTNET, VeyaClient } from "../src/index.js";

const DEFAULT_TX =
  process.argv[2] ??
  "0xd68ab19671f0a3be63651cb6d6e24f5decf591da981708502827bca3689d31d8";

const client = new VeyaClient();
const ping = await client.pingChain();
console.log({
  network: ROBINHOOD_TESTNET.name,
  chainId: ping.chainId.toString(),
  blockNumber: ping.blockNumber,
  tx: DEFAULT_TX,
});

const { proofs, commitmentChecks } = await client.verifyCommitmentOnChain(DEFAULT_TX);
if (proofs.length === 0) {
  console.error("No Veya.sol event on that transaction");
  process.exitCode = 1;
} else {
  console.log({ proofs, commitmentChecks });
  if (commitmentChecks.some((c) => !c.onChain)) {
    console.error("FAIL: event present but commitments(digest) is false");
    process.exitCode = 1;
  } else {
    console.log("OK: receipt events + on-chain commitment mapping");
  }
}
