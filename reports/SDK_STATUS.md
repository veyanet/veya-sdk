# SDK presence | 31 August 2026

Package lives at `@veyanet/sdk`. Hosted API resolves `@veyanet/sdk` to `@veyanet/sdk`.

Live checks used after the tree expansion:

- `npm test`: PQ + chain defaults + operator surfaces
- `npx tsx scripts/doctor.ts`: RPC chain id 46630 + Veya.sol bytecode
- `npx tsx scripts/live-rpc.ts`: parse a known testnet receipt
- `npx tsx examples/pq-identity.ts`: ML-DSA sign/verify
- consensus / sealed examples require local nodes (7701–7703, 7800)
