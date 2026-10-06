/**
 * Write surface for the selected profile.
 * Nothing is sent unless a payer key for that profile is present,
 * and this example still does not broadcast. It only reports readiness.
 *
 *   npx tsx examples/chain-writes.ts
 *   npx tsx examples/chain-writes.ts --network testnet
 */

import {
  ENVIRONMENT_TYPES,
  INSTRUCTION_NAMES,
  SDK_SURFACE,
  VeyaClient,
  type VeyaNetworkName,
} from "../src/index.js";

const networkArg = process.argv[process.argv.indexOf("--network") + 1];
const asked = process.argv.includes("--network");
if (asked && networkArg !== "mainnet" && networkArg !== "testnet") {
  console.error("Pass --network mainnet or --network testnet.");
  process.exit(1);
}
const network = (asked ? networkArg : undefined) as VeyaNetworkName | undefined;
const client = new VeyaClient({ network });
const profile = client.config.network;
const payerSet =
  profile === "testnet"
    ? Boolean(process.env.VEYA_RELAYER_PRIVATE_KEY?.trim() || process.env.VEYA_DEPLOYER_PRIVATE_KEY?.trim())
    : Boolean(process.env.VEYA_MAINNET_RELAYER_PRIVATE_KEY?.trim());

console.log({
  surface: SDK_SURFACE,
  network: profile,
  chainId: client.config.chainId,
  contract: client.config.contractAddress,
  envTypes: ENVIRONMENT_TYPES,
  writeInstructions: INSTRUCTION_NAMES,
});

const ping = await client.pingChain();
console.log("rpc", { chainId: ping.chainId.toString(), block: ping.blockNumber });

if (!payerSet) {
  console.log({ sent: false, reason: `No ${profile} payer key is set. Nothing was sent.` });
} else {
  console.log({
    sent: false,
    reason: "A payer key is set. This example lists the write surface and does not broadcast.",
    methods: [
      "registerEnvironment",
      "registerAgent",
      "storeCommitment",
      "attestExecution",
      "anchorPqAttestation",
      "flagMemoryNullifier",
      "storeSealedState",
      "initSpendingLimit",
      "recordSpend",
      "defineToolPolicy",
    ],
  });
}
