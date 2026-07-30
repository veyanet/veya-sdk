/**
 * Minimal SDK usage — hash locally, then (optionally) submit to Robinhood Chain.
 *
 *   cd @veya/sdk && npm install && npx tsx examples/quickstart.ts
 *
 * On-chain writes need VEYA_DEPLOYER_PRIVATE_KEY in the environment and a
 * funded testnet wallet. Without a key this script only hashes and prints
 * the default Robinhood testnet targets.
 */

import { resolveConfig, ROBINHOOD_TESTNET, VeyaClient } from "../src/index.js";

const client = new VeyaClient();
const digest = await client.hashBlake3(`veya-sdk-quickstart ${new Date().toISOString()}`);
const cfg = resolveConfig();

console.log({
  chain: ROBINHOOD_TESTNET.name,
  chainId: cfg.chainId,
  rpc: cfg.rpcUrl,
  contract: cfg.contractAddress,
  blake3: digest,
  evmReady: Boolean(client.evm),
});
