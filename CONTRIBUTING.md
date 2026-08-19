<div align="center">

  # Contributing to @veya/sdk

  **Robinhood Chain TypeScript SDK: PQ identity, sealed execution, Veya.sol.**

  **[README](README.md)** • **[Security](SECURITY.md)** • **[Documentation Hub](docs/README.md)** • **[Code of Conduct](CODE_OF_CONDUCT.md)**

</div>

---

## Philosophy

This package settles on **Robinhood Chain**, not Solana. Contributions must not reintroduce program IDs, PDA helpers, `bs58` payer secrets, or lamports as the native unit. Spending is **wei**. Instruction names are Solidity **camelCase**.

Post-quantum first: new commitment paths use BLAKE3. Identities use ML-DSA-44. Coordination sessions use Kyber-768. Do not add SHA-256 on SDK commitment paths.

Fail closed: unreachable sealed-node or missing quorum is an error, not a success payload.

---

## Setup

```bash
npm install
npm test
npm run lint
npm run build
npx tsx scripts/doctor.ts
```

Node 20+. Do not commit `.env`.

---

## Layout (where to change things)

| Path | Own this when |
|------|----------------|
| `src/client/` | EvmAnchor, VeyaClient, receipt parsing |
| `src/pq/` | ML-DSA, Kyber, BLAKE3 |
| `src/compute/` | 2-of-3 consensus |
| `src/sealed/` | protectedExec |
| `src/errors/` | VeyaSdkError mapping |
| `docs/` | 500-line technical notes: keep them accurate |
| `../contracts/Veya.sol` | protocol source pin; ABI in `src/abi/` must stay in lockstep |

---

## Tests

- Unit: `npm test` (PQ round-trip, chain defaults, operator surfaces)
- Live RPC: `npx tsx scripts/live-rpc.ts` (needs network)
- Consensus / sealed: local nodes on 7701–7703 and 7800

A change that claims chain success without talking to Robinhood RPC or Veya.sol will be rejected.

---

## Pull requests

1. Describe the risk if the change had shipped wrong.
2. Name the proof (test, doctor output, explorer tx).
3. Do not invent chain receipts or stand-in success payloads. If a node did not run, the SDK must throw.
4. Update `docs/` when the public API or chain defaults change.

---

## License

MIT. By contributing you agree the work is licensed under [LICENSE](LICENSE).
