/**
 * Tiny BLAKE3 throughput probe for operator laptops.
 *
 *   npx tsx benchmarks/blake3-throughput.ts
 */

import { hashBlake3 } from "../src/pq/blake3.js";

const rounds = Number(process.env.VEYA_BENCH_ROUNDS ?? 50);
const payload = "v".repeat(1024);
const start = performance.now();
let last = "";
for (let i = 0; i < rounds; i++) {
  last = await hashBlake3(`${payload}:${i}`);
}
const ms = performance.now() - start;
console.log({
  rounds,
  ms: Math.round(ms),
  perHashMs: Number((ms / rounds).toFixed(3)),
  last,
});
