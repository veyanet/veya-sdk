/**
 * PQ identity + BLAKE3 fingerprint (no chain write).
 *
 *   npx tsx examples/pq-identity.ts
 */

import { pq } from "../src/index.js";

const { publicKey, privateKey } = await pq.generatePQIdentity();
const msg = new TextEncoder().encode("veya sdk pq example");
const sig = await pq.signPQ(msg, privateKey);
const ok = await pq.verifyPQ(sig, msg, publicKey);
const fingerprint = await pq.publicKeyHashBlake3(publicKey);

console.log({
  algorithm: pq.PQ_PROFILE,
  publicKeyBytes: publicKey.length,
  signatureBytes: sig.length,
  verified: ok,
  blake3Fingerprint: fingerprint,
});

if (!ok) process.exitCode = 1;
