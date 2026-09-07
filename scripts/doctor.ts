/**
 * Operator doctor — verify SDK settings the way a user would.
 *
 *   npx tsx scripts/doctor.ts [optionalTxHash]
 *
 * Checks: honesty card, resolved config, Robinhood RPC chain id, Veya.sol
 * bytecode, optional validator / sealed-node liveness, and (when a tx is
 * given or default lives) parse + eth_call commitment proof.
 * Never prints private keys.
 */

import {
  ROBINHOOD_TESTNET,
  SDK_SURFACE,
  VeyaClient,
  describeConfig,
  pingRpc,
} from "../src/index.js";

const OPTIONAL_TX =
  process.argv[2] ??
  "0xd68ab19671f0a3be63651cb6d6e24f5decf591da981708502827bca3689d31d8";

const client = new VeyaClient();
const cfg = client.config;

console.log("=== @veyanet/sdk doctor ===");
console.log("honesty", SDK_SURFACE);
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
console.log("validators (loopback = local ops only)", validators);

const sealed = await pingHttp(`${cfg.sealedNodeUrl.replace(/\/$/, "")}/health`);
console.log("sealed-node (AES-256-GCM, not FHE)", { url: cfg.sealedNodeUrl, health: sealed });

const digest = await client.hashBlake3(`doctor ${new Date().toISOString()}`);
console.log("blake3", digest);

let commitmentOk = true;
try {
  const { proofs, commitmentChecks } = await client.verifyCommitmentOnChain(OPTIONAL_TX);
  console.log("stranger-verify", {
    tx: OPTIONAL_TX,
    proofCount: proofs.length,
    events: proofs.map((p) => p.event),
    commitmentChecks,
  });
  if (commitmentChecks.length > 0) {
    commitmentOk = commitmentChecks.every((c) => c.onChain);
  }
} catch (err) {
  commitmentOk = false;
  console.log("stranger-verify", {
    tx: OPTIONAL_TX,
    error: err instanceof Error ? err.message : String(err),
  });
}

if (!chainOk) {
  process.exitCode = 2;
  console.error("FAIL: RPC is not Robinhood Chain testnet 46630");
} else if (code === "0x") {
  process.exitCode = 2;
  console.error("FAIL: no bytecode at Veya.sol address");
} else if (!commitmentOk) {
  process.exitCode = 2;
  console.error("FAIL: commitment eth_call did not confirm on-chain mapping");
} else {
  console.log("OK: SDK settings point at Robinhood Chain + Veya.sol + live commitment proof");
}
