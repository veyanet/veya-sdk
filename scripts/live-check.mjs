/**
 * Live integration check against VEYA API.
 * Usage: node scripts/live-check.mjs [apiUrl]
 */
import { Veya } from "../dist/index.js";

const apiUrl = process.argv[2] ?? process.env.VEYA_API_URL ?? "https://api.veyanet.tech";

async function guestLogin(baseUrl) {
  const res = await fetch(`${baseUrl}/auth/guest`, { method: "POST" });
  const body = await res.json();
  if (!res.ok) throw new Error(`guest: ${res.status} ${JSON.stringify(body)}`);
  return body.token;
}

async function main() {
  const results = [];
  const fail = (name, err) => {
    results.push({ name, ok: false, detail: String(err) });
  };
  const pass = (name, detail) => {
    results.push({ name, ok: true, detail });
  };

  try {
    const healthRes = await fetch(`${apiUrl}/health`);
    const health = await healthRes.json();
    pass("GET /health", `status=${health.status} anchor.ready=${health.solana?.anchor?.ready}`);
  } catch (e) {
    fail("GET /health", e);
  }

  let token;
  try {
    token = await guestLogin(apiUrl);
    pass("POST /auth/guest", `jwt len=${token?.length ?? 0}`);
  } catch (e) {
    fail("POST /auth/guest", e);
    console.log(JSON.stringify(results, null, 2));
    process.exit(1);
  }

  const veya = new Veya({ apiUrl, accessToken: token });

  try {
    const envs = await veya.environments.list();
    pass("environments.list", `count=${envs.length}`);
  } catch (e) {
    fail("environments.list", e);
  }

  try {
    const anchor = await veya.proofs.anchorContent({
      label: "SDK live check",
      content: `veya-sdk live check ${new Date().toISOString()}`,
    });
    pass("proofs.anchorContent", `tx=${anchor.proof.attestationTx?.slice(0, 12)}…`);
  } catch (e) {
    fail("proofs.anchorContent", e);
  }

  if (results.find((r) => r.name === "proofs.anchorContent" && r.ok)) {
    try {
      const sig = (
        await veya.proofs.anchorContent({
          label: "skip",
          content: "x",
        })
      ).proof.attestationTx;
      const v = await veya.proofs.verifyTransaction(sig);
      pass("proofs.verifyTransaction", `valid=${v.valid} hash=${v.hash?.slice(0, 12)}…`);
    } catch (e) {
      fail("proofs.verifyTransaction", e);
    }
  }

  console.log(JSON.stringify({ apiUrl, results }, null, 2));
  const failed = results.filter((r) => !r.ok);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
