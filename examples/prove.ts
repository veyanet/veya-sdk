/**
 * Run one proof from the shell.
 *
 *   npx tsx examples/prove.ts --text "hello"
 *   npx tsx examples/prove.ts --json payload.json
 *   npx tsx examples/prove.ts --tx 0x...
 *   npx tsx examples/prove.ts --text "hello" --anchor
 *
 * Anchor reads VEYA_PAYER_PRIVATE_KEY, VEYA_DEPLOYER_PRIVATE_KEY, or
 * VEYA_RELAYER_PRIVATE_KEY, and VEYA_ENVIRONMENT_ID. The key is never printed.
 */

import { readFileSync } from "node:fs";
import { VeyaClient, type ProveSource } from "../src/index.js";

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

const text = arg("--text");
const jsonPath = arg("--json");
const tx = arg("--tx");
const anchor = process.argv.includes("--anchor");
const environmentId = arg("--environment") ?? process.env.VEYA_ENVIRONMENT_ID;
const payerPrivateKey =
  process.env.VEYA_PAYER_PRIVATE_KEY ??
  process.env.VEYA_DEPLOYER_PRIVATE_KEY ??
  process.env.VEYA_RELAYER_PRIVATE_KEY;

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

const client = new VeyaClient({ payerPrivateKey });
try {
  const proof = await client.proveInput(source, { anchor, environmentId });
  console.log(JSON.stringify(proof, null, 2));
  if (!proof.ok) process.exit(1);
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  console.log(JSON.stringify({ ok: false, mode: "refused", refusal: message }, null, 2));
  process.exit(1);
}
