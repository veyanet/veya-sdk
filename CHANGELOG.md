# Changelog

All notable changes to the `@veyanet/sdk` package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

> **Note:** Entries before **1.0.0** describe historical Solana-era packages. This tree (`robinhood/sdk`) settles on Robinhood Chain via `Veya.sol` only. Do not treat 0.x Solana / SPL Memo / enclave claims as current product truth.

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
- **Consensus Verification**: Integrated multi-node Ed25519 signature checking and state hash quorum matching.
- **On-Chain State Anchoring**: Support for anchoring decentralized compute consensus outcomes directly to the blockchain via SPL Memos.
- **Documentation**: Added the new `decentralized-compute.md` manual and updated the master index and root README files.

---

## [0.1.1] — 2026-06-02

### Added
- **Comprehensive Documentation Suite**: Complete rewrite of all technical documentation (`api-keys`, `api-map`, `ARCHITECTURE`, `authentication`, `configuration`, `crypto`, `environments-and-agents`, `error-handling`, `executions`, `memory`, `proofs-and-anchoring`, `quickstart`, `solana`).
- **Error Handling**: Exported `VeyaErrorCodes` enum for typed error matching (e.g., `LIMIT_EXCEEDED`, `INVALID_SIGNATURE`).
- **Multi-Environment Support**: Added `resolveConfig()` utility to easily swap between staging and production API URLs.

### Fixed
- Replaced ambiguous `timeout` configuration field with `timeoutMs` to enforce clarity (defaults to `30000` ms).
- Improved `authWithWallet` JWT session state persistence across page reloads.

---

## [0.1.0] — 2026-05-31

### Added
- **Initial Public Alpha** of `@veyanet/sdk`.
- `Veya` client instantiation with `apiUrl` and `apiKey` overrides.
- **Agent Deployments**: `agents.deploy()` and `agents.deployEncrypted()` for deploying agents into isolated workspaces.
- **Environments**: Full CRUD for workspaces including `spendingLimits` configuration.
- **Zero-Knowledge Memory**: `memory.storeContent()` automatically hashes content via SHA-256 before network transmission.
- **Standard Executions**: Read/write access to the `executions` observability layer for tracking agent activity.
- **Protected Executions**: `protection.run()` for enclave-shielded operations with `discloseFields` and `sealFields` filtering.
- **Solana Attestations**: `proofs.anchorContent()` to anchor execution hashes to the Solana ledger via SPL Memo.
- **Authentication**: `authWithWallet()` flow using Ed25519 `signMessage` challenges to issue 24-hour Bearer JWTs.
- **API Keys**: Programmatic creation, revocation, and scoping of `X-Api-Key` credentials.
- **Solana Utilities**: `solana.cluster()`, PDA registration fetching, and `buildUnsignedAttestation()`.

---

## [0.0.4-beta] — 2026-05-15

### Added
- **Spending Budget Enforcement**: Introduced `spendLamports` to execution calls. The API now tracks cumulative period spend and throws `402 Payment Required` if the environment's `maxSolPerPeriod` is exceeded.
- **Protected Runs**: Built out the enclave routing logic for `veya.protection`. Added strict validation ensuring `sealFields` are never returned in the `disclosed` payload map.
- **API Key Tiers**: Differentiated between `vya_dev_...` and `vya_live_...` key prefixes in the auth header resolver.

### Changed
- Standardized all dates to ISO 8601 strings across API responses.
- `executions.create` now requires an explicit `protected: boolean` flag.

---

## [0.0.3-alpha] — 2026-04-28

### Added
- **Solana Relayer Integration**: Connected the SDK to the VEYA relayer for subsidized SPL Memo broadcasting.
- `proofs.verifyTransaction()`: Public endpoint implementation allowing clients to cross-reference transaction signatures with the VEYA proof registry.
- **PDA Identity**: Added endpoints for environment and agent PDA registration (`solana.environmentRegistration` and `solana.agentRegistration`).

### Fixed
- Fixed base58 encoding dependency issues in the wallet JWT signature verification flow.
- Resolved a race condition where fast successive memory stores could clash on rate limits (implemented exponential backoff for `429` responses).

---

## [0.0.2-alpha] — 2026-04-10

### Added
- **Wallet JWT Authentication**: Implemented the two-step `GET /auth/nonce` and `POST /auth/verify` flow for wallet sign-in.
- `HttpClient` interceptor to automatically attach `Authorization: Bearer` or `X-Api-Key` headers to all protected routes.
- Initial implementation of the `memory` namespace for storing 64-character SHA-256 hex digests.

### Changed
- Refactored all internal fetch calls to use an `AbortController` to prevent hanging promises on slow networks.

---

## [0.0.1-pre.0] — 2026-03-22

### Added
- Repository initialization.
- **Cryptography Module**: Implemented client-side AES-256-GCM encryption for agent configurations using the native Web Crypto API (`node:crypto` / `webcrypto.subtle`).
- Implemented `encryptAgentConfig()` and `decryptAgentConfig()` with 32-byte key padding derivation.
- Basic API client skeleton and `Environment` interface definitions.
# Modified: 2026-09-04T13:45:11
# Modified: 2026-09-05T16:56:14
