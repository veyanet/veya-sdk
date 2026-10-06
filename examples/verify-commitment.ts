/**
 * Read a known Testnet receipt. A default client is Mainnet, so this
 * example selects Testnet. No private key. Nothing is sent.
 *
 *   npx tsx examples/verify-commitment.ts
 *   npx tsx examples/verify-commitment.ts 0x...
 */

import { SDK_SURFACE, VeyaClient } from "../src/index.js";

const TX =
  process.argv[2] ??
  "0xd68ab19671f0a3be63651cb6d6e24f5decf591da981708502827bca3689d31d8";

const client = new VeyaClient({ network: "testnet" });

console.log("surface", SDK_SURFACE);
const ping = await client.pingChain();
const local = await client.hashBlake3("verify-example");
const { proofs, commitmentChecks } = await client.verifyCommitmentOnChain(TX);

console.log({
  network: client.config.network,
  chainId: ping.chainId.toString(),
  localBlake3: local,
  tx: TX,
  proofs,
  commitmentChecks,
  explorer: client.explorerFor(TX),
});

if (proofs.length === 0 || commitmentChecks.some((c) => !c.onChain)) {
  process.exitCode = 1;
  console.error("The Testnet receipt did not verify.");
} else {
  console.log("Verified the Testnet commitment without a wallet key.");
}
