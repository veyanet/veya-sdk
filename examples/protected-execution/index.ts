/**
 * Protected execution example.
 *
 * ```bash
 * export VEYA_API_URL=...
 * export VEYA_API_KEY=...
 * export VEYA_ENV_ID=...
 * export VEYA_AGENT_ID=...
 * npx tsx index.ts
 * ```
 */
import { Veya } from "@veya/sdk";

async function main() {
  const veya = new Veya({
    apiUrl: process.env.VEYA_API_URL!,
    apiKey: process.env.VEYA_API_KEY!,
  });
  const environmentId = process.env.VEYA_ENV_ID!;
  const agentId = process.env.VEYA_AGENT_ID!;

  const result = await veya.protection.run(environmentId, {
    agentId,
    eventType: "sdk.protected.example",
    payload: { amount: 50, currency: "USDC" },
    discloseFields: ["currency"],
    sealFields: ["amount"],
    commitResult: true,
    spendLamports: 1000,
  });

  console.log("Execution id:", result.execution.id);
  console.log("Attestation tx:", result.attestationTx ?? "(none)");
}

main().catch(console.error);
