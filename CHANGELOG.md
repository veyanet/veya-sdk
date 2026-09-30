# Changelog

All notable changes to the `@veyanet/sdk` package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

This package settles on **Robinhood Chain** via `Veya.sol` (testnet chain id `46630`). Mainnet is Phase 3.

---

## [1.2.4] — 2026-09-30

### Added
- `proveInput`: text or canonical JSON becomes a BLAKE3 digest. A `0x` transaction hash is read from the live receipt. Success is a parsed `Veya.sol` log plus the explorer link. A hash with no VEYA log is a refusal.
- Anchor writes one `storeCommitment` of that digest only when a funded payer key and an existing environment id are both present, then reads that transaction back. Without anchor, the result is the digest and `anchored` is false. Anchor without a payer key is a refusal. Neither of those sends a transaction.
- `examples/prove.ts` prints that proof JSON and exits non-zero on a refusal.
- The field list and a real run are in [docs/sdk/proof.md](./docs/sdk/proof.md).

---

## [1.2.2] — 2026-09-20

### Added
- Preflight unfunded-payer check on every `EvmAnchor` write (`UNFUNDED_PAYER`).
- Exact operator-facing copy via `NO_TESTNET_TOKENS`: `You don't have testnet tokens. Please get them for the transaction.`
- `isUnfundedPayerError` helper so MCP / product UI can map ethers “insufficient funds” the same way.
- `ROBINHOOD_TESTNET.faucetUrl` and exported `ROBINHOOD_TESTNET_FAUCET_URL` (`https://faucet.testnet.chain.robinhood.com/`).
- Chain tests covering faucet URL + pin exports.

### Changed
- Package identity / publish name aligned to **`@veyanet/sdk@1.2.2`** (tree had drifted to stale `@veya/sdk` / `1.0.0`; `SDK_NAME` / `SDK_VERSION` / `SDK_SURFACE` match npm).
- `EvmAnchor.send` takes a lazy tx factory so balance is checked **before** the wallet prompt; zero-balance wallets never open a doomed signature flow.
- `fromAnchorRevert` normalizes insufficient-funds / intrinsic-gas failures onto `UNFUNDED_PAYER` + `NO_TESTNET_TOKENS` (same sentence as MCP).
- Public exports re-export faucet URL, `isUnfundedPayerError`, and `NO_TESTNET_TOKENS` from the package root.
- Docs retarget contract / pin links to the **vendored** `src/abi/Veya.json` + `src/chain.ts` (no out-of-repo `contracts/Veya.sol` or `deployments/testnet.json` dependency for strangers).
- Docs refreshed across architecture, deployment, quickstart, verification, network pin, PQ, CLI, SDK guides, and ops runbooks for Robinhood testnet **46630**.
- `examples/quickstart.ts`, `scripts/doctor.ts`, and `scripts/live-rpc.ts` refreshed for the published `@veyanet/sdk` surface.
- README / SECURITY / CONTRIBUTING scrubbed for Robinhood settlement honesty (user-paid gas, AES-256-GCM sealed exec, no TEE theater).
- `.gitignore` ignores local `.npmrc` so publish auth tokens are never committed.

### Fixed
- Unfunded payers fail closed with a stable, copy-pasteable error instead of raw ethers `[object Object]` / insufficient-funds noise on write paths.

---

## [1.2.0] — 2026-09-07

### Added
- Phase 2 SDK completion: on-chain read helpers (`commitmentExists`, `getCommitment`, `getNullifier`, `getSpendingLimitOnChain`, `verifyCommitmentOnChain`).
- `parseAllProofsFromTransaction` for multi-event receipts.
- Stranger verify path: `examples/verify-commitment.ts`, doctor + live-rpc eth_call cross-check.
- `examples/phase2-operator.ts` documents spend / nullifier / attest surface.
- Full `Veya.sol` custom-error selector map; `assertBytesLength` before writes.
- `registerPqIdentity` returns ML-DSA `privateKey` + `environmentUuid` for custody.
- `SDK_SURFACE` honesty card (AES-256-GCM, not FHE, not mainnet, not token).
- `recordLocalSpend` name for in-memory ledger (alias `recordSpend` deprecated for clarity vs `EvmAnchor.recordSpend`).

### Changed
- `ENVIRONMENT_TYPES` match Solidity (`Execution` / `SecureEnclave` / `Governance`); legacy Isolated/Shared aliases retained.
- `SDK_VERSION` synced to **1.2.0**; README honesty scrub (no hardware TEE / ZK theater).
- Default `registerPqIdentity` uses `SecureEnclave` by name (same numeric `1` as before).

### Security
- Length asserts fail closed before RPC on UUID / commitment byte sizes.

---

## [1.1.0] — 2026-09-06

### Added
- Phase 2 operator surface aligned with hosted API `https://api.veyanet.tech` (testnet **46630**).
- Docs honesty: sealed execution is **AES-256-GCM + BLAKE3 + ML-DSA**; public examples default to `api.veyanet.tech`; loopback is local debug only.
- Explicit Phase 2 ship pack references: spend / nullifier / `attestExecution` on the hosted relayer path (backend), CORS allowlist, canary, fleet systemd.

### Changed
- Marketing and content docs no longer present AWS Nitro / Intel SGX / live FHE as the product path.
- Changelog and README paths emphasize Robinhood Chain testnet settlement; mainnet remains Phase 3.

### Security
- Product docs and SDK examples refuse to imply open CORS or localhost as production.

---

## [1.0.0] — 2026-08-31

### Added
- **Canonical Package Release**: Official `@veyanet/sdk` release for Robinhood Chain with hosted API (`https://api.veyanet.tech`).
- **Post-Quantum Cryptography Stack**: Integrated FIPS 204 ML-DSA-44 lattice signatures, FIPS 203 Kyber-768 key encapsulation, and BLAKE3-256 digesting.
- **EVM Protocol Settlement (`Veya.sol`)**: Full `EvmAnchor` support for on-chain environment registration, commitments (`storeCommitment`), tool policies (`defineToolPolicy`), spending limits in **wei**, and memory nullifiers.
- **Robinhood Chain Testnet Integration**: Direct JSON-RPC connection to Robinhood Chain (Chain ID `46630`) with automated `eth_chainId` validation via `ensureRobinhoodChain()`.
- **Inlined ABI Architecture**: Bundled `Veya.sol` ABI directly inside `src/abi/` to remove external monorepo dependencies.
- **Typed Error Normalization**: Introduced `VeyaSdkError` with custom Solidity selector mapping and `isVeyaSdkError` typeguard.
- **Operator Diagnostics**: Built `scripts/doctor.ts` and `scripts/live-rpc.ts` for automated RPC diagnostics and live receipt auditing.

### Changed
- Standardized all instruction call names to Solidity camelCase (`storeCommitment`, `registerEnvironment`, `recordSpend`).
- Converted spend limit units to native **wei** (18-decimal).
- Configured default sealed-node port to `7800` and validator cluster ports to `7701-7703`.

---

## [0.1.2] — 2026-06-23

### Added
- **Decentralized Compute Resource**: Added `veya.compute` (`DecentralizedComputeResource`) to orchestrate multi-node consensus-based tasks.
- **Consensus Verification**: Integrated multi-node signature checking and state hash quorum matching.
- **On-Chain State Anchoring**: Support for anchoring decentralized compute consensus outcomes on Robinhood Chain via `Veya.sol` commitments.
- **Documentation**: Added the `decentralized-compute.md` manual and updated the master index and root README files.

---

## [0.1.1] — 2026-06-02

### Added
- **Comprehensive Documentation Suite**: Complete rewrite of technical documentation (`api-keys`, `api-map`, `ARCHITECTURE`, `authentication`, `configuration`, `crypto`, `environments-and-agents`, `error-handling`, `executions`, `memory`, `proofs-and-anchoring`, `quickstart`, Robinhood Chain network pin).
- **Error Handling**: Exported `VeyaErrorCodes` enum for typed error matching (e.g., `LIMIT_EXCEEDED`, `INVALID_SIGNATURE`).
- **Multi-Environment Support**: Added `resolveConfig()` utility to swap between staging and production API URLs.

### Fixed
- Replaced ambiguous `timeout` configuration field with `timeoutMs` (defaults to `30000` ms).
- Improved `authWithWallet` JWT session state persistence across page reloads.

---

## [0.1.0] — 2026-05-31

### Added
- **Initial Public Alpha** of `@veyanet/sdk` for Robinhood Chain.
- `Veya` / `VeyaClient` instantiation with RPC, contract, and API overrides.
- **Agent Deployments**: `agents.deploy()` and `agents.deployEncrypted()` for deploying agents into isolated workspaces.
- **Environments**: Full CRUD for workspaces including `spendingLimits` configuration.
- **Memory Digests**: `memory.storeContent()` hashes content before network transmission.
- **Standard Executions**: Read/write access to the `executions` observability layer for tracking agent activity.
- **Protected Executions**: `protection.run()` / sealed path with `discloseFields` and `sealFields` filtering.
- **Robinhood Attestations**: `proofs.anchorContent()` / `EvmAnchor` to settle execution hashes on Robinhood Chain testnet.
- **Authentication**: Wallet sign-in flow issuing Bearer JWTs for API access.
- **API Keys**: Programmatic creation, revocation, and scoping of `X-Api-Key` credentials.
- **Chain Helpers**: Network pin, explorer URLs, and unsigned attestation builders for Robinhood Chain.

---

## [0.0.4-beta] — 2026-05-15

### Added
- **Spending Budget Enforcement**: Introduced spend tracking in **wei** on execution calls. The API tracks cumulative period spend and throws `402 Payment Required` if the environment limit is exceeded.
- **Protected Runs**: Built out sealed routing for `veya.protection`. Added strict validation ensuring `sealFields` are never returned in the `disclosed` payload map.
- **API Key Tiers**: Differentiated between `vya_dev_...` and `vya_live_...` key prefixes in the auth header resolver.

### Changed
- Standardized all dates to ISO 8601 strings across API responses.
- `executions.create` now requires an explicit `protected: boolean` flag.

---

## [0.0.3-alpha] — 2026-04-28

### Added
- **Robinhood Relayer Integration**: Connected the SDK to the VEYA relayer for subsidized settlement writes on Robinhood Chain testnet.
- `proofs.verifyTransaction()`: Public verify path so clients can cross-reference transaction hashes with the VEYA proof registry.
- **On-Chain Identity**: Environment and agent registration helpers against `Veya.sol`.

### Fixed
- Hardened wallet JWT signature verification flow.
- Resolved a race where fast successive memory stores could hit rate limits (exponential backoff for `429` responses).

---

## [0.0.2-alpha] — 2026-04-10

### Added
- **Wallet JWT Authentication**: Implemented the two-step `GET /auth/nonce` and `POST /auth/verify` flow for wallet sign-in.
- HTTP client interceptor to attach `Authorization: Bearer` or `X-Api-Key` headers to protected routes.
- Initial `memory` namespace for storing content digests.

### Changed
- Refactored internal fetch calls to use an `AbortController` to prevent hanging promises on slow networks.

---

## [0.0.1-pre.0] — 2026-03-22

### Added
- Repository initialization for the Robinhood Chain SDK.
- **Cryptography Module**: Client-side AES-256-GCM encryption for agent configurations (`node:crypto` / `webcrypto.subtle`).
- `encryptAgentConfig()` and `decryptAgentConfig()` with 32-byte key padding derivation.
- Basic API client skeleton and `Environment` interface definitions.
