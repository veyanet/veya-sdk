/**
 * One sealed decision. Nothing is sent when the sealed node is down.
 *
 *   npx tsx examples/seal-decision.ts --environment <mainnet-environment-id> --evidence item-1 --decision "{\"outcome\":\"allow\"}"
 *   npx tsx examples/seal-decision.ts --network testnet --evidence item-1 --decision "{\"outcome\":\"allow\"}"
 *
 * A payer key writes attestExecution only after the sealed runtime answers.
 * The key is never printed.
 */

import { sealDecision, type VeyaNetworkName } from "../src/index.js";

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

const evidenceId = arg("--evidence")?.trim() ?? "";
const decisionRaw = arg("--decision");
const networkArg = arg("--network");
const environmentId = arg("--environment")?.trim() || undefined;
if (!evidenceId || !decisionRaw) {
  console.error("Pass --evidence and --decision.");
  process.exit(1);
}
if (networkArg !== undefined && networkArg !== "mainnet" && networkArg !== "testnet") {
  console.error("Pass --network mainnet or --network testnet.");
  process.exit(1);
}

let decision: Record<string, unknown>;
try {
  const parsed = JSON.parse(decisionRaw) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("decision must be a JSON object");
  }
  decision = parsed as Record<string, unknown>;
} catch (err) {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
}

const operatorRelayer = ["1", "true"].includes(
  (process.env.VEYA_SEAL_DECISION_RELAYER ?? "").trim().toLowerCase(),
);
const network = networkArg as VeyaNetworkName | undefined;
const payerPrivateKey =
  process.env.VEYA_PAYER_PRIVATE_KEY ??
  (network === "testnet" ? undefined : process.env.VEYA_MAINNET_RELAYER_PRIVATE_KEY);

let result: Awaited<ReturnType<typeof sealDecision>>;
try {
result = await sealDecision(
  { evidenceId, decision },
  {
    network,
    environmentId,
    payerPrivateKey,
    operatorRelayer,
    relayerPrivateKey: process.env.VEYA_RELAYER_PRIVATE_KEY,
  },
);
} catch (err) {
  const code = (err as { code?: string }).code ?? "ERROR";
  console.log(JSON.stringify({ ok: false, code, message: err instanceof Error ? err.message : String(err), transaction: null }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exit(1);
