<div align="center">
  <img src="../assets/logo.png" width="400" alt="VEYA Logo" />

  # VEYA TypeScript SDK Documentation Hub

  **Bounded autonomous systems on Robinhood Chain: post-quantum identity, sealed execution, and Veya.sol settlement.**

  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../README.md)
  [![npm](https://img.shields.io/badge/@veya/sdk-1.0.0-cb3837?style=flat-edge)](../package.json)
  [![Node](https://img.shields.io/badge/Node.js-%3E%3D20-green?style=flat-edge)](../package.json)
  [![ethers](https://img.shields.io/badge/ethers-v6-3c3c3d?style=flat-edge)](../package.json)
  [![Testnet](https://img.shields.io/badge/Robinhood%20Chain-46630-blue?style=flat-edge)](https://explorer.testnet.chain.robinhood.com)

  **[Package README](../README.md)** • **[Deployment](./DEPLOYMENT.md)** • **[Operator surface](./CLI.md)** • **[Types](./api/types-reference.md)** • **[Veya.sol](./programs/veya-contract.md)**

</div>

---

## 💡 Information: What This Documentation Covers

The `docs/` tree is the authoritative reference for **`@veya/sdk`**: the TypeScript SDK that integrators and the hosted Robinhood API (`https://api.veyanet.tech`) import in-process. The package provides ML-DSA-44 identity, Kyber-768 session transport, BLAKE3-256 commitments, 2-of-3 validator consensus, sealed-node protected execution, and **ethers v6** writes against **Veya.sol** on **Robinhood Chain**.

This is not a Solana SDK. Settlement is EVM. There is no program ID, no PDA derivation as the product surface, and no SPL Memo companion as the settlement path. `Veya.sol` is a **protocol contract** (environments, agents, attestations, commitments, spending caps, tool policies, memory nullifiers, sealed-state chunks). It is **not** an ERC-20 and it is not a token mint.

No hosted VEYA coordination API is required to use the primitives documented here. Operators run Node scripts against local validator nodes (ports 7701–7703), a sealed node (port 7800), and the public Robinhood Chain testnet JSON-RPC. The optional Rust operator binary `veya-cli` lives in `cli`; this documentation set is about driving `@veya/sdk` from Node.

### Live Robinhood Chain testnet status

`Veya.sol` is **deployed** on Robinhood Chain testnet. Machine-readable state lives in [deployments/testnet.json](../../deployments/testnet.json).

| Field | Value |
|-------|-------|
| **Network** | Robinhood Chain Testnet |
| **chainId** | `46630` (`0xb636`) |
| **Status** | `deployed` |
| **RPC** | `https://rpc.testnet.chain.robinhood.com` |
| **Explorer** | `https://explorer.testnet.chain.robinhood.com` |
| **Veya.sol** | [`0x1a1Dc3c55550FCE9F70ef6cDEeF967c0b72a5d84`](https://explorer.testnet.chain.robinhood.com/address/0x1a1Dc3c55550FCE9F70ef6cDEeF967c0b72a5d84) |
| **Deployer** | `0xa4b900461B265fD1ECdD97792eb3362EEC27bF08` |
| **Deployed at** | `2026-07-15T16:16:30.000Z` |
| **Algorithm** | ML-DSA-44 + Kyber-768 + BLAKE3-256 |
| **Client stack** | ethers v6, `EvmAnchor`, `VeyaClient`, `resolveConfig` |

Contract writes are ordinary EVM transactions. Auditors recompute BLAKE3 digests and verify ML-DSA signatures **off-chain**; the contract stores hashes, signature bytes, and policy state for permanent audit.

---

## 📖 Table of Contents

1. [Design Principles](#design-principles)
2. [Documentation Map (Mermaid)](#documentation-map-mermaid)
3. [Reading Paths by Role](#reading-paths-by-role)
4. [Package Layout](#package-layout)
5. [Documentation Catalog](#documentation-catalog)
6. [On-Chain vs Off-Chain Boundary](#on-chain-vs-off-chain-boundary)
7. [Contract Identity](#contract-identity)
8. [Toolchain Requirements](#toolchain-requirements)
9. [Cross-Cutting Concerns](#cross-cutting-concerns)
10. [Scripts and Operator Utilities](#scripts-and-operator-utilities)
11. [Testing and Verification Entry Points](#testing-and-verification-entry-points)
12. [Glossary](#glossary)
13. [FAQ](#faq)
14. [Support and Security](#support-and-security)

---

## Design Principles

These constraints apply to every document, code path, and operator workflow in this package.

| Principle | What it means | Where to learn more |
|-----------|---------------|---------------------|
| **Environment isolation** | Typed environments with on-chain spending limits, tool policies, memory nullifiers | [programs/veya-contract.md](./programs/veya-contract.md) |
| **No API dependency for primitives** | Local JSON store (`~/.veya`), Node scripts, validator nodes, sealed node: no hosted coordination API required | [CLI.md](./CLI.md) |
| **Validator consensus** | 2-of-3 quorum on critical executions before `attestExecution` | [api/types-reference.md](./api/types-reference.md#consensusresult) |
| **Post-quantum security** | ML-DSA-44 identity and attestation; Kyber-768 session transport; BLAKE3 commitments | Package README and `src/pq/` |
| **Off-chain PQ verification** | EVM gas cannot run ML-DSA at production throughput; chain stores hashes and signature bytes | [programs/veya-contract.md](./programs/veya-contract.md) |
| **BLAKE3 everywhere** | Execution hashes, pubkey fingerprints, ciphertext commitments | `pq.hashBlake3` |
| **Chain-id guard** | `EvmAnchor.ensureRobinhoodChain()` refuses writes when `eth_chainId` is not `46630` (or the configured id) | [DEPLOYMENT.md](./DEPLOYMENT.md) |
| **Wei, not another chain’s native unit** | Spending caps on Robinhood Chain are **wei** (18-decimal ETH) | [programs/storage-layouts.md](./programs/storage-layouts.md) |

**Explicit exclusions:** Solana program IDs, PDA-as-settlement, SPL Memo as the product path, ERC-20 token semantics for `Veya.sol`, and SHA-256 on new commitment paths.

---

## Documentation Map (Mermaid)

The following diagram shows how guides in this tree relate to the live testnet contract and the SDK modules.

```mermaid
flowchart TB
    subgraph Hub["Documentation Hub"]
        README["docs/README.md\n(you are here)"]
    end

    subgraph Onboarding["Onboarding"]
        QS["QUICKSTART.md"]
        CLI["CLI.md"]
        DEPLOY["DEPLOYMENT.md"]
        PKG["../README.md"]
    end

    subgraph Core["Architecture and cryptography"]
        ARCH["ARCHITECTURE.md"]
        PQ["POST_QUANTUM.md"]
        VERIFY["VERIFICATION.md"]
    end

    subgraph OnChain["Veya.sol on Robinhood Chain"]
        PROG["programs/veya-contract.md"]
        STOR["programs/storage-layouts.md"]
    end

    subgraph SDKDocs["TypeScript SDK modules"]
        CFG["sdk/configuration.md"]
        PQSDK["sdk/pq-crypto.md"]
        EVM["sdk/evm-anchoring.md"]
        SEAL["sdk/sealed-execution.md"]
        COORD["sdk/coordination.md"]
    end

    subgraph API["TypeScript API"]
        TYPES["api/types-reference.md"]
    end

    subgraph Live["Live Testnet Proof"]
        JSON["robinhood/deployments/testnet.json"]
        EXPL["explorer.testnet.chain.robinhood.com"]
    end

    README --> PKG
    README --> QS
    README --> CLI
    README --> DEPLOY
    README --> ARCH
    README --> PQ
    README --> PROG
    README --> TYPES
    QS --> CFG
    ARCH --> PROG
    ARCH --> VERIFY
    PQ --> PQSDK
    PQ --> VERIFY
    PROG --> STOR
    CFG --> EVM
    CFG --> SEAL
    CFG --> COORD
    TYPES --> PROG
    DEPLOY --> JSON
    DEPLOY --> EXPL
    CLI --> TYPES
    EVM --> JSON
```

---

## Reading Paths by Role

Choose a path based on your responsibility. Each path is ordered for minimal context switching.

### Path A | New integrator (SDK + local Node)

```mermaid
flowchart LR
    A1[Package README] --> A2[QUICKSTART.md]
    A2 --> A3[CLI.md]
    A3 --> A4[sdk/configuration.md]
    A4 --> A5[api/types-reference.md]
    A5 --> A6[DEPLOYMENT.md]
```

**Goal:** Install `@veya/sdk`, hash with BLAKE3, optionally write to Robinhood Chain testnet with a funded payer key, run consensus against local validators.

### Path B | Smart contract auditor

```mermaid
flowchart LR
    B1[programs/veya-contract.md] --> B2[programs/storage-layouts.md]
    B2 --> B3[api/types-reference.md]
    B3 --> B4[DEPLOYMENT.md]
```

**Goal:** Understand Solidity function semantics, mapping keys, packed struct layouts, custom errors, and how `EvmAnchor` encodes calldata.

### Path C | Infrastructure operator

```mermaid
flowchart LR
    C1[DEPLOYMENT.md] --> C2[CLI.md]
    C2 --> C3[scripts/doctor.ts]
    C3 --> C4[scripts/live-rpc.ts]
```

**Goal:** Confirm RPC, chain id, contract bytecode, validator fleet (7701–7703), sealed node (7800), and funded deployer key.

### Path D | Policy / MCP runtime developer

```mermaid
flowchart LR
    D1[api/types-reference.md] --> D2[programs/veya-contract.md]
    D2 --> D3[CLI.md]
```

**Goal:** Tool policy routing, `PolicyAgent`, memory nullifiers, on-chain `defineToolPolicy` alignment.

### Path E | Hosted API maintainer

```mermaid
flowchart LR
    E1[Package README] --> E2[api/types-reference.md]
    E2 --> E3[DEPLOYMENT.md]
```

**Goal:** Applications consume this package via `@veya/sdk`. Keep ABI, chain constants, and env vars in lockstep.

---

## Package Layout

```

├── src/
│   ├── abi/              # Inlined Veya.sol ABI + bytecode (no @veya/program dep)
│   ├── chain.ts          # ROBINHOOD_TESTNET constants, explorer helpers
│   ├── config.ts         # VeyaClientConfig, resolveConfig
│   ├── index.ts          # Public barrel
│   ├── client/
│   │   ├── VeyaClient.ts # High-level facade
│   │   └── evm.ts        # EvmAnchor: ethers v6 writes
│   ├── compute/          # 2-of-3 runConsensus
│   ├── coordination/     # MCP router, Kyber sessions, PolicyAgent
│   ├── errors/           # VeyaSdkError, revert selector map
│   ├── memory/           # Local ~/.veya/agent-memory.json + nullifiers
│   ├── pq/               # ML-DSA-44, Kyber-768, BLAKE3
│   ├── program/          # INSTRUCTION_NAMES camelCase
│   ├── sealed/           # protectedExec HTTP client
│   └── spending/         # In-process wei caps (pre-chain)
├── examples/
│   └── quickstart.ts     # Hash locally; print testnet targets
├── scripts/
│   ├── doctor.ts         # Operator connectivity / config check
│   └── live-rpc.ts       # Live JSON-RPC probe against testnet
├── docs/                 # You are here
├── package.json          # name: @veya/sdk
└── README.md             # Package intro
```

Related trees outside this package:

| Path | Role |
|------|------|
| `robinhood/contracts/Veya.sol` | Protocol source pin; ABI in `src/abi/` must stay in lockstep |
| `robinhood/deployments/testnet.json` | Live address, deployer, timestamp |
| `robinhood/fixtures/testnet-proofs.json` | Known testnet receipt hashes |
| `cli` | Optional Rust `veya-cli` (not this package) |
| `https://api.veyanet.tech` | Hosted API that imports `@veya/sdk` |
| `robinhood/utility` | Dashboard; talks HTTP to the API, not to this package directly |

---

## Documentation Catalog

### 🚀 Getting Started

| Guide | Description |
|-------|-------------|
| [../README.md](../README.md) | Package intro, install, five-minute hash + optional on-chain write |
| [QUICKSTART.md](./QUICKSTART.md) | End-to-end Node walkthrough against Robinhood testnet |
| [CLI.md](./CLI.md) | Node operator surface: `npm test`, examples, `scripts/doctor.ts`, `scripts/live-rpc.ts` |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Using the deployed contract, funding a payer, validator/sealed cluster, env vars |

### 🛡️ Architecture and Cryptography

| Guide | Description |
|-------|-------------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System architecture, trust boundaries, component deep dives |
| [POST_QUANTUM.md](./POST_QUANTUM.md) | ML-DSA-44, Kyber-768, BLAKE3 sizes and verification split |
| [VERIFICATION.md](./VERIFICATION.md) | Off-chain PQ verification workflows and audit procedures |

### ⛓️ On-Chain Protocol

| Guide | Description |
|-------|-------------|
| [programs/veya-contract.md](./programs/veya-contract.md) | All ten `Veya.sol` functions with args, events, errors, and `EvmAnchor` mapping |
| [programs/storage-layouts.md](./programs/storage-layouts.md) | Mapping keys, packed structs, slot math, calldata encoding |

### 🧩 TypeScript SDK Modules

| Guide | Responsibility |
|-------|----------------|
| [sdk/configuration.md](./sdk/configuration.md) | `VeyaClientConfig`, environment variables, `resolveConfig` |
| [sdk/pq-crypto.md](./sdk/pq-crypto.md) | SDK PQ primitives: keygen, sign, verify, BLAKE3 hash |
| [sdk/evm-anchoring.md](./sdk/evm-anchoring.md) | `EvmAnchor`, ethers v6 writes, chain-id guard |
| [sdk/sealed-execution.md](./sdk/sealed-execution.md) | `protectedExec`, sealed-node HTTP protocol |
| [sdk/coordination.md](./sdk/coordination.md) | MCP routing, Kyber sessions, `PolicyAgent` |

### 📚 API Reference

| Guide | Description |
|-------|-------------|
| [api/types-reference.md](./api/types-reference.md) | `VeyaClientConfig`, `ConsensusResult`, `SealedExecResult`, `MemoryEntry`, `SpendingLimit`, `PolicyAgent`, `ROBINHOOD_TESTNET`, `EvmAnchor`, `InstructionName` |

---

## On-Chain vs Off-Chain Boundary

Understanding this split is prerequisite for every other guide.

```mermaid
flowchart TB
    subgraph OnChain["On-Chain (Veya.sol / Robinhood EVM)"]
        OC1["BLAKE3 hash storage bytes32"]
        OC2["ML-DSA sig bytes in attestations mapping"]
        OC3["PQ pubkey fingerprint bytes32"]
        OC4["Spending limits in wei and tool policies"]
        OC5["Memory nullifier flags"]
        OC6["Sealed ciphertext chunks up to 8192 B"]
    end

    subgraph OffChain["Off-Chain (Node / @veya/sdk)"]
        OF1["ML-DSA sign and verify"]
        OF2["Kyber encapsulate / decapsulate"]
        OF3["BLAKE3 hash and compare"]
        OF4["2-of-3 quorum evaluation"]
        OF5["Full pubkey distribution"]
        OF6["Local ~/.veya/agent-memory.json"]
    end

    OnChain -.->|"audit artifacts only"| OffChain
```

| Data class | On-chain | Off-chain |
|------------|----------|-----------|
| Full ML-DSA public keys | Fingerprint only (`bytes32 pqPubkeyHash`) | Operator vault / SDK process memory |
| Signature validity | Stored in `attestations[key].mldsaSig`, not verified in Solidity | `pq.verifyPQ` |
| Kyber session keys | Never stored | `establishKyberSession` |
| Execution payload | BLAKE3 digest only | Validator / sealed-node bodies |
| Consensus results | Optional `attestExecution` after quorum | Ephemeral JSON from validator fleet |
| Memory content | Nullifier flag only | `~/.veya/agent-memory.json` |

`EvmAnchor` is the only module that submits transactions. `VeyaClient` constructed without `payerPrivateKey` still hashes, runs consensus, and calls the sealed node.

---

