/**
 * One proof from the shell: text, JSON, or a receipt.
 *
 *   npx tsx examples/prove.ts --text "hello"
 *   npx tsx examples/prove.ts --json payload.json --network testnet
 *   npx tsx examples/prove.ts --tx 0x... --network mainnet
 *   npx tsx examples/prove.ts --text "hello" --anchor
 *
 * Omit --network and the client uses Mainnet.
 * --anchor reads VEYA_PAYER_PRIVATE_KEY, or the profile payer slot.
 * The key is never printed. Without a key, --anchor does not broadcast.
 */

import { readFileSync } from "node:fs";
import { VeyaClient, type ProveSource, type VeyaNetworkName } from "../src/index.js";

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

const text = arg("--text");
const jsonPath = arg("--json");
const tx = arg("--tx");
const anchor = process.argv.includes("--anchor");
const networkArg = arg("--network");
const environmentId = arg("--environment") ?? process.env.VEYA_ENVIRONMENT_ID;

if (networkArg !== undefined && networkArg !== "mainnet" && networkArg !== "testnet") {
  console.error('Pass --network mainnet or --network testnet.');
  process.exit(1);
}
const network = networkArg as VeyaNetworkName | undefined;
const profile = network ?? "mainnet";
const payerPrivateKey =
  process.env.VEYA_PAYER_PRIVATE_KEY ??
  (profile === "testnet"
    ? process.env.VEYA_RELAYER_PRIVATE_KEY ?? process.env.VEYA_DEPLOYER_PRIVATE_KEY
    : process.env.VEYA_MAINNET_RELAYER_PRIVATE_KEY);

const chosen = [text, jsonPath, tx].filter((value) => value !== undefined);
if (chosen.length !== 1) {
  console.error("Pass exactly one of --text, --json, or --tx.");
  process.exit(1);
}

let source: ProveSource;
if (text !== undefined) {
  source = { kind: "text", text };
} else if (jsonPath !== undefined) {
  source = { kind: "json", value: JSON.parse(readFileSync(jsonPath, "utf8")) };
} else {
  source = { kind: "tx", txHash: tx! };
}

const client = new VeyaClient({ network, payerPrivateKey });
try {
  const proof = await client.proveInput(source, { anchor, environmentId });
  console.log(JSON.stringify({ network: client.config.network, ...proof }, null, 2));
  if (!proof.ok) process.exit(1);
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  console.log(JSON.stringify({ ok: false, mode: "refused", network: client.config.network, refusal: message }, null, 2));
  process.exit(1);
}
