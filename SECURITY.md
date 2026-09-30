<div align="center">

  # VEYA SDK | Security Policy

  **Coordinated disclosure for @veyanet/sdk on Robinhood Chain.**

  **[Verification](docs/VERIFICATION.md)** • **[Architecture](docs/ARCHITECTURE.md)** • **[Contributing](CONTRIBUTING.md)**

</div>

---

## Supported versions

| Version | Supported |
|---------|-----------|
| 1.0.x | Yes |
| < 1.0 | No |

---

## Reporting a vulnerability

Do not open public issues for security vulnerabilities. Report privately to **security@veyanet.tech**.

Include: summary, component (`EvmAnchor`, `runConsensus`, `protectedExec`, PQ modules), impact, reproduction, Node version, whether the report is against Robinhood testnet or a local node.

Acknowledgment target: 72 hours. Coordinated disclosure with the reporter before a public fix is described in [CHANGELOG.md](CHANGELOG.md).

---

## What never to commit

| Artifact | Why |
|----------|-----|
| `.env` with `VEYA_DEPLOYER_PRIVATE_KEY` | Funded relayer / payer key |
| `~/.veya/agent-memory.json` | Local memory store |
| Validator ML-DSA secret keys under the node home | Node identity |

---

## Threat model (SDK-relevant)

| Adversary | Mitigation |
|-----------|------------|
| Wrong-chain RPC | `ensureRobinhoodChain` / `pingChain` compare `eth_chainId` to 46630 |
| Sealed node down | `protectedExec` throws; callers must not invent success |
| One dishonest validator | 2-of-3 matching BLAKE3 required |
| Harvest-now against classical identity | ML-DSA-44 + BLAKE3 commitments |

PQ signature verification is off-chain. The contract stores hashes and signature bytes. Full model: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/POST_QUANTUM.md](docs/POST_QUANTUM.md).

---

## Dependency posture

`ethers` talks to Robinhood JSON-RPC. `@noble/post-quantum` implements ML-DSA-44 and Kyber-768. `hash-wasm` implements BLAKE3. Pin versions via `package-lock.json`. Run `npm audit` in this directory before a release.

---

## Node hardening

Validator and sealed-node binaries are not this package. Bind them to localhost in development. Do not expose `/execute` or `/protected` on a public interface without an operator access model.
