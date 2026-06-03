/**
 * Anchor text on Solana via VEYA.
 *
 * ```bash
 * export VEYA_API_URL=https://api.veyanet.tech
 * export VEYA_API_KEY=vya_dev_...
 * npx tsx index.ts
 * ```
 */
import { Veya } from "@veya/sdk";

async function main() {
  const veya = new Veya({
    apiUrl: process.env.VEYA_API_URL!,
    apiKey: process.env.VEYA_API_KEY!,
  });

  const result = await veya.proofs.anchorContent({
    label: "SDK example anchor",
    content: `Anchored at ${new Date().toISOString()} from @veya/sdk example.`,
  });

  console.log("Content hash:", result.contentHash);
  console.log("Solana tx:", result.proof.attestationTx);
  console.log("Explorer:", result.explorerUrl);
}

main().catch(console.error);
