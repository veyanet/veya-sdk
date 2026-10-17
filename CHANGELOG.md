# Changelog

All notable changes to the `@veyanet/sdk` package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

This package settles on Robinhood Chain through `Veya.sol`, a protocol contract and not a token. The default profile is **Mainnet** (`0x87dC582eEA544A434a5C1e30Ca3d12c1e548a674`). **Testnet** (`0x1a1Dc3c55550FCE9F70ef6cDEeF967c0b72a5d84`) is selected with `network: "testnet"` or `ROBINHOOD_NETWORK=testnet`. Pins are in [docs/NETWORK_PIN.md](./docs/NETWORK_PIN.md).

---

## [1.2.8] — 2026-10-17

### Fixed (launch)
- `sealDecision` sets `sealed.transaction` to the chain receipt hash.
- `walletAddChainParams()`, `explorerTxUrl()`, `explorerAddressUrl()` and `explorerContractUrl()` default to the selected profile (Mainnet unless `ROBINHOOD_NETWORK=testnet`). New export `defaultRobinhoodProfile()`.
- Package version **1.2.8**.

## [Unreleased → 1.2.8]

### Added
- `Veya.sol` is deployed on Mainnet at `0x87dC582eEA544A434a5C1e30Ca3d12c1e548a674`. Deploy transaction `0x20207430b768f2215e68a0f37739070599362047493acf1b90a2eba2b7653559`, block 80962087. It is a protocol contract (environments, agents, commitments, attestations), not a token. The numeric pins are in [docs/NETWORK_PIN.md](./docs/NETWORK_PIN.md).
- One maintenance write on that contract: `registerEnvironment` transaction `0x69553b14423e3c04bd7b3ae2831ce2a637be9d5d8db663538c4dae8568cc898d`, block 80962617. The read-back owner is the dedicated payer `0x5612E209761e0948EfD0aF7d516dB047180cbC5D`.
- Mainnet is the default profile. Omit `network`, or leave `ROBINHOOD_NETWORK` unset, and the client uses Mainnet. `network: "testnet"` or `ROBINHOOD_NETWORK=testnet` keeps Testnet and `0x1a1Dc3c55550FCE9F70ef6cDEeF967c0b72a5d84`.
- Mainnet payer slot is `VEYA_MAINNET_RELAYER_PRIVATE_KEY` only. A Testnet deployer key in the environment is not borrowed.
- `SETTLEMENT` records the deployed protocol contract, Guest Use closed, and Guest Build 403. `PHASE3_DECISION` remains an alias.
- Receipts stay on the profile that produced them. `assertReceiptChain` returns `RECEIPT_CHAIN` and does not relabel a Testnet receipt onto Mainnet, or the reverse.
- `SDK_SURFACE` names Mainnet as the package default. The card lists `sealed: "AES-256-GCM"` and `settlement: "mainnet"`.

### Changed
- `resolveNetworkName` treats only the exact value `testnet` as Testnet. Unset and any other value resolve to Mainnet.
- An explicit empty Mainnet contract (`contractAddress: ""` or `VEYA_MAINNET_CONTRACT_ADDRESS=`) still returns `MAINNET_UNPUBLISHED` and sends nothing. Unset uses the deployed protocol address.
- A projected fee above 0.01 ETH at a gas ceiling of 300,000 still returns `FEE_CAP` and sends nothing.
- Guest settlement on Mainnet still returns `GUEST_TESTNET_ONLY`. Clearing `VEYA_MAINNET_GUEST_KILL` does not open Guest Use, because the written decision is closed.
- `mainnetDeployPlan()` still returns `broadcast: false` and does not send a deployment.
- `.env.example` no longer pins Testnet RPC values, so copying it does not hide the Mainnet default. Validator and sealed-node URLs stay on loopback because those processes run on the operator machine.
- Examples name the selected profile. The known Testnet receipt in `examples/verify-commitment.ts` is read with `network: "testnet"`.
- Package tests live under `tests/`. They exercise the resolver, the ABI, the fee check, and ML-DSA sign/verify. They do not broadcast.

### Fixed
- The settlement module header no longer says settlement is unpublished. Mainnet is deployed. The public processes at `https://api.veyanet.tech` and `https://mcp.veyanet.tech` were not switched and still serve Testnet until those processes are restarted.
- A default client no longer inherits `VEYA_CONTRACT_ADDRESS` onto Mainnet. That variable belongs to Testnet.
- Documentation that described Testnet as the only deployment now names both profiles. Both use the same `Veya.sol` ABI.

---

## [1.2.8] — 2026-10-02

### Added
- Phase 3 gates that do not deploy: Robinhood Chain is the chosen network and `settlementLive` stays false. A receipt keeps the chain id that produced it (`RECEIPT_CHAIN` if a caller tries to relabel it). Guest Use on mainnet stays no, and `VEYA_MAINNET_GUEST_KILL` defaults to halted. A real-ETH amount above 0.01 ETH returns `FEE_CAP`. `mainnetDeployPlan` does not broadcast.
- The mainnet guard profile named in 1.2.7 is in this tree. `network: "mainnet"` or `ROBINHOOD_NETWORK=mainnet` selects, the mainnet RPC, and the mainnet explorer. The payer slot on that profile is `VEYA_MAINNET_RELAYER_PRIVATE_KEY` only. A projected fee above `0.01 ETH` at a gas ceiling of `300,000` returns `FEE_CAP` and sends nothing. Guest settlement on that profile returns `GUEST_TESTNET_ONLY`. Default resolution stays testnet. An explicit empty contract returns `MAINNET_UNPUBLISHED` and sends nothing. The deployed address is recorded in Unreleased above.
- `sealDecision`: an evidence id and a decision object go in. The sealed runtime runs first. If it does not answer, the result is `SEALED_UNREACHABLE` and nothing is sent. If it answers, a 2-of-3 ML-DSA quorum follows. `attestExecution` is sent when a payer key is passed, or when the seal-decision relayer switch is on and a relayer key is passed into the call. With the switch off and no payer key, the sealed result and the quorum are returned and nothing is sent.
- `examples/seal-decision.ts` prints that JSON and exits non-zero on a refusal.
- The field list and a real run are in [docs/sdk/seal-decision.md](./docs/sdk/seal-decision.md).

---

## [1.2.7] — 2026-10-02

### Added
- `ROBINHOOD_MAINNET`:, RPC `https://rpc.mainnet.chain.robinhood.com`, explorer `https://robinhoodchain.blockscout.com`. The contract address in this cut was filled later; see Unreleased.
- A mainnet call is explicit (`network: "mainnet"` or `ROBINHOOD_NETWORK=mainnet`). Default resolution stays testnet.
- `eth_chainId` must match the profile before a write. A mismatch returns `CHAIN_MISMATCH` and sends nothing.
- An empty mainnet contract returns `MAINNET_UNPUBLISHED` and sends nothing. The payer for that profile is `VEYA_MAINNET_RELAYER_PRIVATE_KEY` only.
- A fee above `MAINNET_MAX_FEE_WEI` (0.01 ETH, gas ceiling 300,000) returns `FEE_CAP` and sends nothing.

---

## [1.2.6] — 2026-10-02

### Added
- `sealDecision` first landed here: evidence id and decision in, sealed runtime first, then a 2-of-3 ML-DSA quorum, then one `attestExecution` when a payer is available.

---

## [1.2.5] — 2026-10-01

### Added
- A receipt that called a different contract still returns the full proof object. `refusal` is `transaction did not target Veya.sol — not a VEYA proof`.

---

## [1.2.4] — 2026-09-30

### Added
- `proveInput`: text or canonical JSON becomes a BLAKE3 digest. A `0x` transaction hash is read from the live receipt. Success is a parsed `Veya.sol` log plus the explorer link. A hash with no VEYA log is a refusal.
- Anchor writes one `storeCommitment` of that digest only when a funded payer key and an existing environment id are both present, then reads that transaction back. Without anchor, the result is the digest and `anchored` is false. Anchor without a payer key is a refusal. Neither of those sends a transaction.
- `examples/prove.ts` prints that proof JSON and exits non-zero on a refusal.
- The field list and a real run are in [docs/sdk/proof.md](./docs/sdk/proof.md).

---

## [1.2.3] — 2026-09-29

### Changed
- Package identity and the honesty card report `1.2.3`.
- Robinhood testnet chain hex is pinned in the profile.

---

## [1.2.2] — 2026-09-20

### Added
- Preflight unfunded-payer check on every `EvmAnchor` write (`UNFUNDED_PAYER`).
- Exact operator-facing copy via `NO_TESTNET_TOKENS`: `You don't have testnet tokens. Please get them for the transaction.`
- `isUnfundedPayerError` helper so MCP / product UI can map ethers “insufficient funds” the same way.
- `ROBINHOOD_TESTNET.faucetUrl` and exported `ROBINHOOD_TESTNET_FAUCET_URL` (`https://faucet.testnet.chain.robinhood.com/`).
- Chain tests covering faucet URL + pin exports.

### Changed
- Package identity / publish name aligned to **`@veyanet/sdk@1.2.2`** (tree had drifted to stale `@veyanet/sdk` / `1.0.0`; `SDK_NAME` / `SDK_VERSION` / `SDK_SURFACE` match npm).
- `EvmAnchor.send` takes a lazy tx factory so balance is checked **before** the wallet prompt; zero-balance wallets never open a doomed signature flow.
- `fromAnchorRevert` normalizes insufficient-funds / intrinsic-gas failures onto `UNFUNDED_PAYER` + `NO_TESTNET_TOKENS` (same sentence as MCP).
- Public exports re-export faucet URL, `isUnfundedPayerError`, and `NO_TESTNET_TOKENS` from the package root.
- Docs retarget contract / pin links to the **vendored** `src/abi/Veya.json` + `src/chain.ts` (no out-of-repo `contracts/Veya.sol` or `deployments/testnet.json` dependency for strangers).
- Docs refreshed across architecture, deployment, quickstart, verification, network pin, PQ, CLI, SDK guides, and ops runbooks for Robinhood Testnet.
- `examples/quickstart.ts`, `scripts/doctor.ts`, and `scripts/live-rpc.ts` refreshed for the published `@veyanet/sdk` surface.
- README / SECURITY / CONTRIBUTING scrubbed for Robinhood settlement honesty (own-wallet gas, AES-256-GCM sealed exec, no TEE theater).
- `.gitignore` ignores local `.npmrc` so publish auth tokens are never committed.

### Fixed
- Unfunded payers fail closed with a stable, copy-pasteable error instead of raw ethers `[object Object]` / insufficient-funds noise on write paths.

---

## [1.2.1] — 2026-09-08

### Added
- `VeyaClient` exposes the read-only commitment, nullifier, and spending-limit lookups.

---

## [1.2.0] — 2026-09-07

### Added
- Phase 2 SDK completion: on-chain read helpers (`commitmentExists`, `getCommitment`, `getNullifier`, `getSpendingLimitOnChain`, `verifyCommitmentOnChain`).
- `parseAllProofsFromTransaction` for multi-event receipts.
- Stranger verify path: `examples/verify-commitment.ts`, doctor + live-rpc eth_call cross-check.
- `examples/phase2-operator.ts` documents spend / nullifier / attest surface.
- Full `Veya.sol` custom-error selector map; `assertBytesLength` before writes.
- `registerPqIdentity` returns ML-DSA `privateKey` + `environmentUuid` for custody.
- `SDK_SURFACE` honesty card (AES-256-GCM, not mainnet, not token).
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
- Phase 2 operator surface aligned with hosted API `https://api.veyanet.tech` (Testnet).
- Docs honesty: sealed execution is **AES-256-GCM + BLAKE3 + ML-DSA**; public examples default to `api.veyanet.tech`; loopback is local debug only.
- Explicit Phase 2 ship pack references: spend / nullifier / `attestExecution` on the hosted relayer path (backend), CORS allowlist, canary, fleet systemd.

### Changed
- Marketing and content docs no longer present AWS Nitro / Intel SGX / live FHE as the product path.
- Changelog and README paths emphasize Robinhood Chain testnet settlement; mainnet remains Phase 3.

### Security
- Product docs and SDK examples refuse to imply open CORS or your host as production.

---

## [1.0.0] — 2026-08-31

### Added
- **Canonical Package Release**: Official `@veyanet/sdk` release for Robinhood Chain with hosted API (`https://api.veyanet.tech`).
- **Post-Quantum Cryptography Stack**: Integrated FIPS 204 ML-DSA-44 lattice signatures, FIPS 203 Kyber-768 key encapsulation, and BLAKE3-256 digesting.
- **EVM Protocol Settlement (`Veya.sol`)**: Full `EvmAnchor` support for on-chain environment registration, commitments (`storeCommitment`), tool policies (`defineToolPolicy`), spending limits in **wei**, and memory nullifiers.
- **Robinhood Chain Testnet Integration**: Direct JSON-RPC connection to Robinhood Chain with automated `eth_chainId` validation via `ensureRobinhoodChain()`.
- **Inlined ABI Architecture**: Bundled `Veya.sol` ABI directly inside `src/abi/` to remove external monorepo dependencies.
- **Typed Error Normalization**: Introduced `VeyaSdkError` with custom Solidity selector mapping and `isVeyaSdkError` typeguard.
- **Operator Diagnostics**: Built `scripts/doctor.ts` and `scripts/live-rpc.ts` for automated RPC diagnostics and live receipt auditing.

### Changed
- Standardized all instruction call names to Solidity camelCase (`storeCommitment`, `registerEnvironment`, `recordSpend`).
- Converted spend limit units to native **wei** (18-decimal).
- Configured default sealed-node port to `<sealed-port>` and validator cluster ports to `their configured ports`.

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
