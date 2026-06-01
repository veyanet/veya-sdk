/**
 * Quickstart — list environments with an API key.
 *
 * ```bash
 * cd examples/quickstart
 * cp .env.example .env
 * # edit .env
 * npm install
 * npx tsx index.ts
 * ```
 */
import { Veya } from "@veya/sdk";

async function main() {
  const apiUrl = process.env.VEYA_API_URL;
  const apiKey = process.env.VEYA_API_KEY;
  if (!apiUrl || !apiKey) {
    console.error("Set VEYA_API_URL and VEYA_API_KEY in .env or environment");
    process.exit(1);
  }

  const veya = new Veya({ apiUrl, apiKey });
  const health = await veya.health();
  console.log("Health:", health.status, "cluster:", health.solana.cluster);

  const environments = await veya.environments.list();
  console.log(`Found ${environments.length} environment(s)`);
  for (const env of environments) {
    console.log(`  - ${env.name} (${env.type}) [${env.status}]`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
