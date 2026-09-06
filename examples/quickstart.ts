/**
 * Minimal SDK usage — hash locally, ping chain, optional write.
 *
 *   cd robinhood/sdk && npm install && npx tsx examples/quickstart.ts
 *
 * On-chain writes need VEYA_DEPLOYER_PRIVATE_KEY. Without a key this still
 * pings Robinhood testnet and prints honesty surface (user path).
 */

import {
  ROBINHOOD_TESTNET,
  SDK_SURFACE,
  VeyaClient,
  resolveConfig,
} from "../src/index.js";

const client = new VeyaClient();
const digest = await client.hashBlake3(`veya-sdk-quickstart ${new Date().toISOString()}`);
const cfg = resolveConfig();
const ping = await client.pingChain();

console.log({
  surface: SDK_SURFACE,
  chain: ROBINHOOD_TESTNET.name,
  chainId: cfg.chainId,
  rpc: cfg.rpcUrl,
  contract: cfg.contractAddress,
  blockNumber: ping.blockNumber,
  blake3: digest,
  evmReady: Boolean(client.evm),
  tip: "For stranger verify without a key: npm run example:verify",
});
