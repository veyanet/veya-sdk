/**
 * Phase 2 operator surface — documents write APIs.
 * Without VEYA_DEPLOYER_PRIVATE_KEY this only lists the surface and reads chain.
 * With a funded key it can init spend / nullifier / attest (testnet only).
 *
 *   npx tsx examples/phase2-operator.ts
 */

import {
  ENVIRONMENT_TYPES,
  INSTRUCTION_NAMES,
  SDK_SURFACE,
  VeyaClient,
} from "../src/index.js";

const client = new VeyaClient();

console.log("surface", SDK_SURFACE);
console.log("envTypes", ENVIRONMENT_TYPES);
console.log("writeInstructions", INSTRUCTION_NAMES);

const ping = await client.pingChain();
console.log("rpc", { chainId: ping.chainId.toString(), block: ping.blockNumber });

if (!client.evm) {
  console.log(
    "writesSkipped: set VEYA_DEPLOYER_PRIVATE_KEY to exercise initSpendingLimit / recordSpend / flagMemoryNullifier / attestExecution on testnet",
  );
  process.exitCode = 0;
} else {
  console.log(
    "evmReady: payer configured — call EvmAnchor methods intentionally; this script does not auto-spend",
  );
  console.log({
    methods: [
      "initSpendingLimit",
      "recordSpend",
      "flagMemoryNullifier",
      "attestExecution",
      "storeCommitment",
      "defineToolPolicy",
    ],
  });
}
