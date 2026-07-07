<div align="center">
  <img src="../assets/logo.png" width="400" alt="VEYA Logo" />

  # Post-Quantum Cryptography in @veya/sdk

  **ML-DSA-44 • Kyber-768 • BLAKE3-256: harvest-attack-resistant by design.**

  [![NIST FIPS 204](https://img.shields.io/badge/ML--DSA-FIPS%20204-blue?style=flat-edge)](https://csrc.nist.gov/pubs/fips/204/final)
  [![NIST FIPS 203](https://img.shields.io/badge/Kyber-FIPS%20203-purple?style=flat-edge)](https://csrc.nist.gov/pubs/fips/203/final)
  [![Robinhood Testnet](https://img.shields.io/badge/Chain-46630-blue?style=flat-edge)](https://explorer.testnet.chain.robinhood.com)

  **[Architecture](./ARCHITECTURE.md)** • **[Verification](./VERIFICATION.md)** • **[Quickstart](./QUICKSTART.md)** • **[README](../README.md)**

</div>

---

`@veya/sdk` is built **post-quantum first**. Every new code path in this package uses **ML-DSA-44** for signatures, **Kyber-768** for key encapsulation, and **BLAKE3-256** for commitments. Ethereum secp256k1 remains the chain’s transaction authorization (`msg.sender` on `Veya.sol`); it is not the agent identity algorithm.

This guide explains how each primitive is used in the TypeScript SDK, where verification happens, byte-level sizes, NIST alignment, and how on-chain storage on Robinhood Chain relates to off-chain cryptographic assurance.

Settlement is EVM. Hashes land as `bytes32`. Signature blobs land as `bytes` bounded by `MAX_MLDSA_SIG_LEN = 4627`. The contract does not run Dilithium. Auditors run `verifyPQ`.

---

## Table of Contents

1. [Why Post-Quantum First](#why-post-quantum-first)
2. [Live Testnet Cryptographic Proof](#live-testnet-cryptographic-proof)
3. [Algorithm Selection Matrix](#algorithm-selection-matrix)
4. [ML-DSA-44 Identity and Attestation](#ml-dsa-44-identity-and-attestation)
5. [Kyber-768 Session Transport](#kyber-768-session-transport)
6. [BLAKE3 Commitments](#blake3-commitments)
7. [AES-256-GCM Sealed Path](#aes-256-gcm-sealed-path)
8. [Hybrid Migration Reality](#hybrid-migration-reality)
9. [On-Chain vs Off-Chain Verification](#on-chain-vs-off-chain-verification)
10. [TypeScript Implementation](#typescript-implementation)
11. [Key Lifecycle](#key-lifecycle)
12. [Attestation Canonicalization](#attestation-canonicalization)
13. [Security Properties](#security-properties)
14. [Domain Separation](#domain-separation)
15. [Operational Checklist](#operational-checklist)
16. [Failure Modes](#failure-modes)
17. [Invariants](#invariants)
18. [References](#references)

---

## Why Post-Quantum First

Harvest-now-decrypt-later attacks target long-lived agent identities and settlement records. An adversary recording today’s ECDSA-signed Ethereum transactions may not forge `msg.sender` history (the chain’s account model still binds an address), but they **can** forge classical signatures that were used as **agent identity** once a cryptographically relevant quantum computer exists. If your “agent cert” was secp256k1, the cert dies. If it was ML-DSA-44, the cert survives.

```mermaid
flowchart LR
    subgraph Today["Adversary Today"]
        REC["Record classical\nsignatures and ciphertext"]
    end
    subgraph Future["Quantum Future"]
        BREAK["Break ECDSA secp256k1"]
        FORGE["Forge historical\nagent attestations"]
    end
    subgraph VEYA["VEYA Mitigation"]
        PQ["ML-DSA-44 identity"]
        B3["BLAKE3 commitments"]
        OFF["Off-chain verify +\non-chain audit bytes"]
    end
    REC --> BREAK --> FORGE
    PQ --> OFF
    B3 --> OFF
```

VEYA mitigates HNDL by:

- Anchoring **BLAKE3** digests (Grover-resistant at 256-bit output) as `bytes32` on `Veya.sol`
- Storing **ML-DSA** signature bytes alongside commitments when the caller uses `attestExecution`
- Using **Kyber-768** for coordination session keys (never on-chain)
- Keeping full public keys off-chain while storing **BLAKE3(pubkey)** fingerprints on-chain

**Design rule:** SHA-256 is not used on new SDK commitment paths. BLAKE3 is the sole hash standard in `@veya/sdk`. keccak256 appears only as EVM mapping-key derivation (`abi.encodePacked`), which is addressing, not a VEYA commitment.

Ethereum ECDSA still pays gas. That is not a PQ identity. Mixing the two on purpose is the architecture: chain authorization versus agent authorization.

---

## Live Testnet Cryptographic Proof

PQ operations are **confirmed on Robinhood Chain testnet**: real contract writes, real receipts, real explorer links.

| Field | Value |
|-------|-------|
| **Network** | Robinhood Chain Testnet |
| **Chain ID** | `46630` |
| **RPC** | `https://rpc.testnet.chain.robinhood.com` |
| **Explorer** | `https://explorer.testnet.chain.robinhood.com` |
| **Veya.sol** | `0x1a1Dc3c55550FCE9F70ef6cDEeF967c0b72a5d84` |
| **Algorithm** | ML-DSA-44 + Kyber-768 + BLAKE3-256 |
| **Client** | ethers v6 + `@noble/post-quantum` + `hash-wasm` |

### Confirmed transactions

| Operation | Explorer |
|-----------|----------|
| Guest content proof | [0x4314faef…395d](https://explorer.testnet.chain.robinhood.com/tx/0x4314faefee6f1c635f91dd075384d4816e10abd84b9bb88e3328b51e630e395d) |
| Sealed-execution commitment | [0xd68ab196…31d8](https://explorer.testnet.chain.robinhood.com/tx/0xd68ab19671f0a3be63651cb6d6e24f5decf591da981708502827bca3689d31d8) |
| PQ / environment registration path | [0x9a00af5e…8ad4](https://explorer.testnet.chain.robinhood.com/tx/0x9a00af5ef80fdefb3734df19ad30b82aa57fa212bd493b7ad5b224a343808ad4) |

Re-run locally: `npm install && npm test` for round-trips; funded writes via `VeyaClient.registerPqOnchain` or the live ship check. There is no token address in these receipts. `receipt.to` is the protocol contract.

---

## Algorithm Selection Matrix

| Use case | Algorithm | NIST standard | Parameter set | Package |
|----------|-----------|---------------|---------------|---------|
| Environment / agent identity | ML-DSA-44 | [FIPS 204](https://csrc.nist.gov/pubs/fips/204/final) | Dilithium2 | `@noble/post-quantum` `ml_dsa44` |
| Validator node attestation | ML-DSA-44 | FIPS 204 | Dilithium2 | same, plus node binary |
| Coordination session KEM | Kyber-768 | [FIPS 203](https://csrc.nist.gov/pubs/fips/203/final) | ML-KEM-768 | `@noble/post-quantum` `ml_kem768` |
| Execution commitments | BLAKE3-256 |: | 256-bit output | `hash-wasm` `createBLAKE3` |
| Sealed payload encryption | AES-256-GCM | [SP 800-38D](https://csrc.nist.gov/pubs/sp/800/38d/final) | 256-bit key | sealed-node |
| Pubkey fingerprint | BLAKE3(pubkey_bytes) |: | 32-byte digest | `publicKeyHashBlake3` |
| Transaction authorization | secp256k1 ECDSA | Ethereum |: | ethers v6 `Wallet` |
| Mapping keys | keccak256 | EVM | addressing only | Solidity `abi.encodePacked` |

`Veya.sol` stores detached ML-DSA signatures with `MAX_MLDSA_SIG_LEN = 4627`. That bound is larger than ML-DSA-44’s typical signature so a future parameter-set bump does not immediately require a storage-layout change. v1 signers still use ML-DSA-44.

---

## ML-DSA-44 Identity and Attestation

### Purpose

ML-DSA (Module-Lattice-Based Digital Signature Algorithm) provides EUF-CMA unforgeability under quantum adversaries assuming Module-LWE hardness. VEYA uses ML-DSA-44 for:

- Environment and agent identity (pubkey hash on-chain)
- Execution attestation signatures (bytes stored in `Attestation.mldsaSig`)
- Validator node `NodeResult` attestations
- `routeSecureMessage` envelopes after policy allows the tool

### Byte sizes (ML-DSA-44 / FIPS 204)

| Artifact | Bytes | Hex chars | Notes |
|----------|-------|-----------|-------|
| Public key | 1,312 | 2,624 | Stored off-chain only |
| Secret key | 2,560 | 5,120 | Operator custody |
| Signature | 2,420 | 4,840 | Detached; typical ML-DSA-44 |
| On-chain max sig | 4,627 | 9,254 | `MAX_MLDSA_SIG_LEN` storage bound |
| Seed | 32 | 64 | Key generation entropy |
| Fingerprint | 32 | 64 | BLAKE3 of public key |

### NIST parameter mapping

| NIST designation | CRYSTALS name | VEYA v1 |
|------------------|---------------|---------|
| ML-DSA-44 | Dilithium2 | **Default identity algorithm** (`ml_dsa44`) |
| ML-DSA-65 | Dilithium3 | Not used |
| ML-DSA-87 | Dilithium5 | Not used; storage bound can hold a larger sig |

If you generate ML-DSA-87 keys and try to pass them through `attestExecution`, you may still fit the 4,627-byte cap, but verifiers in this SDK call `ml_dsa44.verify`. Stay on ML-DSA-44.

### Signing flow

```mermaid
flowchart LR
    P["Payload bytes"] --> H["BLAKE3-256"]
    H --> D["32-byte digest"]
    D --> S["ML-DSA-44 sign"]
    SK["Secret key 2560 B"] --> S
    S --> SIG["Detached sig 2420 B"]
    SIG --> CHAIN["attestExecution mldsaSig"]
    D --> CHAIN
```

**Critical rule:** On-chain attestations sign the **32-byte BLAKE3 digest**, not the raw payload and not the hex encoding of the digest.

### TypeScript API

```typescript
import * as pq from "@veya/sdk/pq";

const { publicKey, privateKey } = await pq.generatePQIdentity();
const digest = await pq.hashBlake3Bytes(payloadBytes);
const sig = await pq.signPQ(digest, privateKey);
const ok = await pq.verifyPQ(sig, digest, publicKey);
const hash = await pq.publicKeyHashBlake3(publicKey);
```

`VeyaClient.pqKeygen()` is the same `generatePQIdentity`.

### On-chain storage model

The contract never stores full public keys. Registration functions accept:

| Field | Size | Function |
|-------|------|----------|
| `pqPubkeyHash` | 32 bytes | `registerEnvironment` |
| `agentPqHash` | 32 bytes | `registerAgent` |
| `mldsaSig` | ≤ 4,627 bytes | `attestExecution` |
| `identityHash` + `executionHash` | 32 + 32 | `anchorPqAttestation` |

Verifiers recompute `BLAKE3(public_key_bytes)` locally and compare to the on-chain fingerprint. `anchorPqAttestation` links those two hashes without repeating the signature blob: useful when the relayer stored only a commitment.

---

## Kyber-768 Session Transport

### Purpose

Kyber (ML-KEM) provides IND-CCA2 secure key encapsulation. VEYA uses Kyber-768 to establish shared secrets between coordination participants. Session keys are derived via BLAKE3 from the shared secret: **never used raw**, **never written to `Veya.sol`**.

### Byte sizes (Kyber-768 / ML-KEM-768)

| Artifact | Bytes | Notes |
|----------|-------|-------|
| Public key | 1,184 | KEM encapsulation input |
| Secret key | 2,400 | Decapsulation only |
| Ciphertext | 1,088 | Transmitted to decapsulator |
| Shared secret | 32 | Derived into AES-256-GCM key via BLAKE3 |

### NIST parameter mapping

| NIST designation | Security category | VEYA usage |
|------------------|-------------------|------------|
| ML-KEM-512 | Category 1 | Not used |
| ML-KEM-768 | Category 3 | **Default** session KEM |
| ML-KEM-1024 | Category 5 | Available in the library; not default |

### KEM flow

```mermaid
sequenceDiagram
    participant A as Initiator
    participant B as Responder

    Note over A,B: B publishes Kyber public key 1184 B
    A->>A: encapsulate pk_B
    A->>B: ciphertext 1088 B
    A->>A: shared_secret_A 32 B
    B->>B: decapsulate ct sk_B
    B->>B: shared_secret_B 32 B
    Note over A,B: BLAKE3 shared_secret plus context to AES-256-GCM key
```

### TypeScript API

```typescript
import * as pq from "@veya/sdk/pq";
import { establishKyberSession, getNodeKyberPublicKey } from "@veya/sdk";

const { publicKey, privateKey } = pq.generateKyberKeys();
const { ciphertext, sharedSecret } = pq.encapsulateKyber(publicKey);
const recovered = pq.decapsulateKyber(ciphertext, privateKey);

const session = await establishKyberSession("agent-a", "agent-b");
// session.sessionId is BLAKE3(from:to:timestamp)
```

`establishKyberSession` encapsulates to a process-local Kyber key (`getNodeKyberPublicKey`). Session IDs are BLAKE3 of the agent pair plus timestamp. Shared secrets stay in an in-memory map. They are not chain objects.

`routeSecureMessage` runs policy first. On allow, it attaches `kyberSessionId` and an ML-DSA signature over the JSON envelope. Policy is a gate, not a cryptographic afterthought.

### Usage in sealed execution

The SDK passes `sessionEntropy` (32 bytes) to sealed-node as `session_entropy_hex`. Combined with Kyber-derived material, the node derives AES-256-GCM keys. Kyber material **never** lands on-chain.

---

## BLAKE3 Commitments

### Why BLAKE3 over SHA-256?

| Property | SHA-256 | BLAKE3-256 |
|----------|---------|------------|
| Classical collision resistance | 128-bit | 128-bit |
| Post-Grover preimage margin | 128-bit | **256-bit output → 128-bit margin** |
| Throughput (software) | Moderate | High (WASM in this SDK) |
| VEYA SDK v1 status | Not used on new paths | **Required** |

SHA-256 provides 128-bit security against Grover's algorithm. BLAKE3 at 256-bit output maintains comfortable margin for long-lived settlement records that must remain verifiable for decades.

The hosted Use-mode content proof may hash with SHA-256 so a browser can preview without a PQ stack. That is an API product choice. This SDK’s `hashBlake3` is BLAKE3 only.

### Byte sizes

| Artifact | Bytes | Encoding |
|----------|-------|----------|
| BLAKE3 digest | 32 | Raw or 64 hex chars |
| Chunk hash (sealed) | 32 | Per ≤8,192-byte ciphertext chunk |
| Mapping key (EVM) | 32 | keccak of packed fields: not the commitment |

### Commitment domains

| Domain | Input | Output location |
|--------|-------|-----------------|
| Execution | Canonical payload bytes | `Attestation.blake3Hash` |
| Pubkey fingerprint | ML-DSA public key bytes (1,312 B) | `Environment.pqPubkeyHash` |
| Standalone result | Application-defined 32 bytes | `Commitment.commitment` |
| Memory content | Memory entry data string | SDK `blake3ContentHash` |
| Ciphertext chunk | Sealed chunk bytes | `SealedState.blake3CiphertextHash` |
| Consensus | Validator payload | `NodeResult.blake3_execution_hash` |
| Kyber session id | `from:to:timestamp` string | In-memory `KyberSession.sessionId` |

### Commitment graph

```mermaid
flowchart TB
    subgraph Inputs["Hash Inputs"]
        PK["ML-DSA pubkey 1312 B"]
        PL["Execution payload"]
        CT["Ciphertext chunk"]
        MEM["Memory content"]
    end
    subgraph Blake3["BLAKE3-256"]
        H["32-byte digest"]
    end
    subgraph Outputs["Storage"]
        MAP["Veya.sol mappings"]
        EVT["Events"]
        LOCAL["~/.veya JSON"]
    end
    PK --> H
    PL --> H
    CT --> H
    MEM --> H
    H --> MAP
    H --> EVT
    H --> LOCAL
```

### TypeScript

```typescript
import { pq } from "@veya/sdk";

const hex = await pq.hashBlake3(payload);
const bytes = await pq.hashBlake3Bytes(payload);
```

Implementation: `createBLAKE3()` from `hash-wasm`, `init`, `update`, `digest("hex")`. Empty input is a valid message; do not special-case it as “no hash.”

Unlike some program runtimes, `Veya.sol` does **not** recompute BLAKE3 inside the EVM on `storeSealedState`. The caller supplies `blake3CiphertextHash`. Auditors must recompute BLAKE3(chunk) off-chain and compare. That is a trust-boundary difference versus an in-program hash: the chain guarantees **what hash was declared with what chunk**, not that the hash is well-formed. Always recompute.

---

## AES-256-GCM Sealed Path

Sealed execution is a **process boundary**, not a homomorphic marketplace.

| Step | Primitive | Where |
|------|-----------|-------|
| Session entropy | 32 random bytes | SDK caller |
| Key derivation | Kyber + BLAKE3 | sealed-node |
| Payload privacy | AES-256-GCM | sealed-node |
| Output binding | BLAKE3 of result / ciphertext | `SealedExecResult` |
| Node authenticity | ML-DSA over execution hash | `mldsa_signature` |
| Data availability | optional chunk + declared hash | `storeSealedState` |

Full TFHE / FHE compute is **not** claimed as live. If a document says “homomorphic” without naming AES-256-GCM as the current path, it is describing a future module, not this SDK.

Fail-closed: if `:7800` is down, `protectedExec` throws. Painting `verified: true` without a node round-trip is a lie this client will not tell.

---

## Hybrid Migration Reality

This SDK does not ship a `ClassicalLegacy` write path for agent identity. New environments register `pqPubkeyHash` from ML-DSA-44. Operators still use secp256k1 wallets to pay gas because that is how Robinhood Chain authenticates transactions.

| Lane | Algorithms | New agent keys | Notes |
|------|------------|----------------|-------|
| Agent identity | ML-DSA-44 + BLAKE3 | Required | Fingerprint on-chain |
| Session transport | Kyber-768 | Required | Off-chain only |
| Gas / `msg.sender` | secp256k1 | EVM requirement | Not an agent cert |
| Historical ECDSA agent certs |: | Forbidden | Do not register keccak(ethAddress) as `pqPubkeyHash` |

If you are rotating a fleet that previously treated an Ethereum address as identity, generate ML-DSA keys, register a new environment (or a new `revision` after a contract that supports rotation), and distribute the full pubkey out of band. Dual-signing during a window is an operator procedure, not a SDK mode flag.

```mermaid
flowchart TD
    A["Incoming attestation"] --> B["Load ML-DSA-44 pubkey"]
    B --> C["BLAKE3 pk equals on-chain hash"]
    C -->|no| F["Reject"]
    C -->|yes| D["verifyPQ over 32-byte digest"]
    D -->|fail| F
    D -->|pass| G["Accept agent identity"]
    G --> H["Separately: receipt.signer paid gas"]
```

Never treat `receipt.from` as a substitute for `pqPubkeyHash`.

---

