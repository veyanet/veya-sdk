/**
 * Operator doctor — verify SDK settings the way a user would.
 *
 *   npx tsx scripts/doctor.ts
 *
 * Checks: resolved config, Robinhood RPC chain id, Veya.sol bytecode present,
 * optional validator / sealed-node liveness. Never prints private keys.
 */

import {
  ROBINHOOD_TESTNET,
  VeyaClient,
  describeConfig,
  pingRpc,
} from "../src/index.js";

const client = new VeyaClient();
const cfg = client.config;

console.log("=== @veyanet/sdk doctor ===");
console.log(JSON.stringify(describeConfig(cfg), null, 2));

const ping = await pingRpc(cfg.rpcUrl);
const chainOk = ping.chainId === BigInt(cfg.chainId);
console.log("rpc", {
  chainId: ping.chainId.toString(),
  blockNumber: ping.blockNumber,
  matchesConfig: chainOk,
  expected: ROBINHOOD_TESTNET.chainId,
});

const { ethers } = await import("ethers");
const provider = new ethers.JsonRpcProvider(cfg.rpcUrl);
const code = await provider.getCode(cfg.contractAddress);
console.log("veya.sol", {
  address: cfg.contractAddress,
  hasCode: code !== "0x" && code.length > 4,
  explorer: `${cfg.explorerUrl}/address/${cfg.contractAddress}`,
});

async function pingHttp(url: string): Promise<number | string> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(cfg.requestTimeoutMs) });
    return res.status;
  } catch (err) {
    return err instanceof Error ? err.message : "unreachable";
  }
}

const validators = [];
for (const u of cfg.validatorNodes) {
  validators.push({ url: u, health: await pingHttp(`${u.replace(/\/$/, "")}/health`) });
}
console.log("validators", validators);

const sealed = await pingHttp(`${cfg.sealedNodeUrl.replace(/\/$/, "")}/health`);
console.log("sealed-node", { url: cfg.sealedNodeUrl, health: sealed });

const digest = await client.hashBlake3(`doctor ${new Date().toISOString()}`);
console.log("blake3", digest);

if (!chainOk) {
  process.exitCode = 2;
  console.error("FAIL: RPC is not Robinhood Chain testnet 46630");
} else if (code === "0x") {
  process.exitCode = 2;
  console.error("FAIL: no bytecode at Veya.sol address");
} else {
  console.log("OK: SDK settings point at Robinhood Chain + Veya.sol");
}
