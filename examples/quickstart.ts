/**
 * Default Mainnet client. No private key.
 *
 *   npx tsx examples/quickstart.ts
 */

import { SDK_SURFACE, VeyaClient, resolveConfig } from "../src/index.js";

const client = new VeyaClient();
const cfg = resolveConfig();
const digest = await client.hashBlake3("veya-sdk-quickstart");
const ping = await client.pingChain();

console.log({
  surface: SDK_SURFACE,
  network: cfg.network,
  chainId: cfg.chainId,
  rpc: cfg.rpcUrl,
  contract: cfg.contractAddress,
  blockNumber: ping.blockNumber,
  blake3: digest,
});
