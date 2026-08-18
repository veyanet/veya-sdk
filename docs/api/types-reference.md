# Types Reference

**Complete TypeScript type catalog for `@veya/sdk` on Robinhood Chain.**

Use this reference when building Node integrations, the hosted API (`https://api.veyanet.tech`), audit tooling, or MCP agents. All new commitments use **BLAKE3-256**. Identity and attestations use **ML-DSA-44**. Coordination sessions use **Kyber-768**. PQ signature verification is **off-chain only**. On-chain types are Solidity structs behind mappings on **Veya.sol**: not Solana account layouts.

Package: `@veya/sdk` at `@veya/sdk`. Client: ethers v6. Facade: `VeyaClient`. Writes: `EvmAnchor`. Config: `resolveConfig`.

**Related:** [../README.md](../README.md) • [veya-contract.md](../programs/veya-contract.md) • [storage-layouts.md](../programs/storage-layouts.md) • [DEPLOYMENT.md](../DEPLOYMENT.md)

---

## Table of Contents

1. [Type System Overview](#type-system-overview)
2. [Constants](#constants)
3. [ROBINHOOD_TESTNET](#robinhood_testnet)
4. [VeyaClientConfig](#veyaclientconfig)
5. [resolveConfig and ResolvedVeyaConfig](#resolveconfig-and-resolvedveyaconfig)
6. [VeyaClient](#veyaclient)
7. [EvmAnchor](#evmanchor)
8. [InstructionName](#instructionname)
9. [ABI exports](#abi-exports)
10. [Consensus types](#consensus-types)
11. [SealedExecResult](#sealedexecresult)
12. [MemoryEntry](#memoryentry)
13. [SpendingLimit](#spendinglimit)
14. [PolicyAgent](#policyagent)
15. [Coordination and Kyber](#coordination-and-kyber)
16. [PQ module (`@veya/sdk/pq`)](#pq-module-veyasdkpq)
17. [VeyaSdkError](#veyasdkerror)
18. [Solidity struct mirrors](#solidity-struct-mirrors)
19. [Explorer helpers](#explorer-helpers)
20. [Serialization notes](#serialization-notes)
21. [Cross-layer mapping](#cross-layer-mapping)
22. [See Also](#see-also)

---

## Type System Overview

```mermaid
flowchart TB
    subgraph TS["TypeScript @veya/sdk"]
        VCC["VeyaClientConfig"]
        NR["NodeResult"]
        MM["McpMessage"]
        ME["MemoryEntry"]
        SL["SpendingLimit"]
        PA["PolicyAgent"]
        SE["SealedExecResult"]
    end

    subgraph Client["Client classes"]
        VC["VeyaClient"]
        EA["EvmAnchor"]
    end

    subgraph Chain["Veya.sol mappings"]
        ENV["environments[bytes16]"]
        AG["agents[bytes16]"]
        AT["attestations[bytes32]"]
    end

    VCC --> VC
    VC --> EA
    EA -->|"ethers v6 calldata"| Chain
    TS -->|"BLAKE3 hex / bytes32"| Chain
```

| Layer | Module | Primary types |
|-------|--------|---------------|
| Config | `src/config.ts` | `VeyaClientConfig`, `ResolvedVeyaConfig` |
| Network | `src/chain.ts` | `ROBINHOOD_TESTNET`, `RobinhoodNetwork` |
| Client | `src/client/` | `VeyaClient`, `EvmAnchor` |
| Crypto | `src/pq/` | identity pair, Kyber pair, hex digest |
| Compute | `src/compute/consensus.ts` | `NodeResult`, `ConsensusResult` |
| Sealed | `src/sealed/` | `SealedPayload`, `SealedExecResult` |
| Memory | `src/memory/` | `MemoryEntry` |
| Spend | `src/spending/limits.ts` | `SpendingLimit` |
| Policy | `src/coordination/policyAgent.ts` | `PolicyAgent`, `PolicyDecision` |
| Errors | `src/errors/veya-error.ts` | `VeyaSdkError`, `VeyaErrorCode` |
| Settlement | `src/program/instructions.ts` | `InstructionName` |

---

## Constants

| Name | Value | Location | Description |
|------|-------|----------|-------------|
| `ROBINHOOD_TESTNET_CHAIN_ID` | `46630` | `chain.ts` | Decimal chain id |
| `chainIdHex` | `0xb636` | `ROBINHOOD_TESTNET` | Hex chain id |
| `VEYA_CONTRACT_ADDRESS` | `0x1a1Dc3c55550FCE9F70ef6cDEeF967c0b72a5d84` | `abi/index.ts` | Protocol contract |
| `MAX_MLDSA_SIG_LEN` | `4627` | `Veya.sol` | Max Dilithium sig bytes stored |
| `MAX_SEALED_CHUNK` | `8192` | `Veya.sol` | Max ciphertext per chunk |
| `MAX_TOOL_NAME_LEN` | `64` | `Veya.sol` | Tool ACL name limit |
| Default quorum threshold | `2` | `consensus.ts` | 2-of-3 validators |
| Default validator ports | `7701–7703` | `config.ts` | Local fleet |
| Default sealed port | `7800` | `config.ts` | sealed-node |
| BLAKE3 digest size | `32` bytes | All layers | Commitment width |
| UUID width | `16` bytes | `bytes16` | environment / agent / memory ids |
| Native decimals | `18` | ETH on Robinhood Chain | Spend amounts in **wei** |
| ML-DSA parameter set | ML-DSA-44 | `mldsa.ts` | FIPS 204 |
| KEM parameter set | ML-KEM-768 | `kyber.ts` | FIPS 203 (Kyber-768) |

There is no program ID constant. The protocol identity is a 20-byte EVM address.

---

## ROBINHOOD_TESTNET

```typescript
declare const ROBINHOOD_TESTNET_CHAIN_ID = 46630;

declare const ROBINHOOD_TESTNET: {
  readonly chainId: 46630;
  readonly chainIdHex: "0xb636";
  readonly name: "Robinhood Chain Testnet";
  readonly rpcUrl: "https://rpc.testnet.chain.robinhood.com";
  readonly explorerUrl: "https://explorer.testnet.chain.robinhood.com";
  readonly nativeCurrency: {
    readonly name: "ETH";
    readonly symbol: "ETH";
    readonly decimals: 18;
  };
  readonly contractAddress: "0x1a1Dc3c55550FCE9F70ef6cDEeF967c0b72a5d84";
};

type RobinhoodNetwork = typeof ROBINHOOD_TESTNET;
```

| Field | Meaning |
|-------|---------|
| `chainId` | Passed to `resolveConfig` and compared in `EvmAnchor.ensureRobinhoodChain` |
| `rpcUrl` | Default JSON-RPC; override with `ROBINHOOD_RPC_URL` |
| `explorerUrl` | Origin without trailing slash |
| `nativeCurrency` | ETH; spending APIs use wei (`bigint`) |
| `contractAddress` | Veya.sol: protocol, **not** an ERC-20 |

```typescript
import {
  ROBINHOOD_TESTNET,
  ROBINHOOD_TESTNET_CHAIN_ID,
  isRobinhoodTestnet,
} from "@veya/sdk";

isRobinhoodTestnet(46630); // true
isRobinhoodTestnet(1n);    // false
```

`isRobinhoodTestnet` accepts `number | bigint` and compares with `BigInt(46630)`.

---

## VeyaClientConfig

```typescript
type VeyaClientConfig = {
  rpcUrl?: string;
  contractAddress?: string;
  chainId?: number;
  explorerUrl?: string;
  payerPrivateKey?: string;
  validatorNodes?: string[];
  sealedNodeUrl?: string;
};
```

| Field | Type | Default via `resolveConfig` | Notes |
|-------|------|----------------------------|-------|
| `rpcUrl` | `string` | `ROBINHOOD_RPC_URL` or testnet RPC | HTTPS JSON-RPC |
| `contractAddress` | `string` | `VEYA_CONTRACT_ADDRESS` | 20-byte checksum-optional |
| `chainId` | `number` | `ROBINHOOD_CHAIN_ID` or `46630` | Compared as `bigint` on-chain |
| `explorerUrl` | `string` | explorer testnet origin | No trailing slash preferred |
| `payerPrivateKey` | `string` | `VEYA_DEPLOYER_PRIVATE_KEY` | Hex secp256k1; never commit |
| `validatorNodes` | `string[]` | split `VEYA_VALIDATOR_NODES` or localhost 7701–7703 | Origins, no `/execute` suffix |
| `sealedNodeUrl` | `string` | `VEYA_SEALED_NODE_URL` or `http://127.0.0.1:7800` | Origin, no `/protected` suffix |

All fields are optional. An empty constructor is valid and yields a client that can hash and call local nodes but cannot write.

---

## resolveConfig and ResolvedVeyaConfig

```typescript
type ResolvedVeyaConfig = {
  rpcUrl: string;
  contractAddress: string;
  chainId: number;
  explorerUrl: string;
  payerPrivateKey: string | undefined;
  validatorNodes: string[];
  sealedNodeUrl: string;
};

declare function resolveConfig(config?: VeyaClientConfig): ResolvedVeyaConfig;
```

`ResolvedVeyaConfig` is the **filled** form: every field except `payerPrivateKey` is a concrete string or number. `VeyaClient` stores this on `client.config`.

Precedence (first wins):

1. Value passed in `config`
2. Matching environment variable
3. `ROBINHOOD_TESTNET` / hardcoded localhost nodes

`VEYA_VALIDATOR_NODES` is split on commas **without trimming in older mental models**: the consensus client **does** `base.trim()` per URL. Prefer no spaces, or rely on trim.

---

## VeyaClient

```typescript
declare class VeyaClient {
  readonly config: ResolvedVeyaConfig;
  evm?: EvmAnchor;
  constructor(config?: VeyaClientConfig);
  explorerFor(txHash: string): string;
  pqKeygen(): Promise<{ publicKey: Uint8Array; privateKey: Uint8Array }>;
  hashBlake3(data: string | Uint8Array): Promise<string>;
  registerPqOnchain(envType?: number): Promise<{
    publicKey: Uint8Array;
    publicKeyHash: string;
    environmentTx: string;
    memoTx: string;
    explorer: { environment: string; memo: string };
  }>;
  runConsensus(taskId: string, payload: object): Promise<ConsensusResult>;
  protectedExecute(params: {
    environmentId: string;
    agentId: string;
    eventType: string;
    payload: object;
    sessionEntropy: Uint8Array;
  }): Promise<SealedExecResult>;
}
```

| Method | Returns | Requires |
|--------|---------|----------|
| `constructor` | `VeyaClient` | Nothing; key optional |
| `explorerFor` | Explorer `/tx/` URL | Nothing |
| `pqKeygen` | ML-DSA-44 pair | Nothing |
| `hashBlake3` | 64-char hex | Nothing |
| `registerPqOnchain` | Two tx hashes + explorer URLs | `evm` (payer key) |
| `runConsensus` | `ConsensusResult` | Reachable `validatorNodes` |
| `protectedExecute` | `SealedExecResult` | Reachable `sealedNodeUrl` |

`evm` is set only when `payerPrivateKey` or `VEYA_DEPLOYER_PRIVATE_KEY` is present. `registerPqOnchain` throws if `evm` is missing.

`envType` default is **1** (`SecureEnclave`). See [EnvironmentType](#environmenttype).

The field names `environmentTx` / `memoTx` on the registration result refer to `registerEnvironment` and `storeCommitment` receipts. The second write is a **Veya.sol commitment**, not an external memo program.

---

## EvmAnchor

```typescript
declare class EvmAnchor {
  readonly provider: ethers.JsonRpcProvider;
  readonly contract: ethers.Contract;
  readonly wallet: ethers.Wallet;
  readonly chainId: number;
  readonly explorerUrl: string;
  readonly contractAddress: string;
  constructor(config: VeyaClientConfig & { payerPrivateKey: string });
  explorerFor(txHash: string): string;
  ensureRobinhoodChain(): Promise<void>;
  registerEnvironment(environmentUuid: Uint8Array, pqPubkeyHash: Uint8Array, envType: number): Promise<string>;
  registerAgent(environmentUuid: Uint8Array, agentUuid: Uint8Array, agentRole: number, agentPqHash: Uint8Array): Promise<string>;
  storeCommitment(environmentUuid: Uint8Array, commitment: Uint8Array): Promise<string>;
  anchorPqAttestation(environmentUuid: Uint8Array, identityHash: Uint8Array, executionHash: Uint8Array): Promise<string>;
  attestExecution(environmentUuid: Uint8Array, blake3Hash: Uint8Array, mldsaSig: Uint8Array): Promise<string>;
  initSpendingLimit(agentUuid: Uint8Array, maxAmount: bigint, periodSecs: number): Promise<string>;
  recordSpend(agentUuid: Uint8Array, amount: bigint): Promise<string>;
  defineToolPolicy(environmentUuid: Uint8Array, agentUuid: Uint8Array, toolName: string, allowed: boolean): Promise<string>;
  flagMemoryNullifier(environmentUuid: Uint8Array, memoryId: Uint8Array): Promise<string>;
  storeSealedState(
    environmentUuid: Uint8Array,
    stateId: Uint8Array,
    chunkIndex: number,
    blake3CiphertextHash: Uint8Array,
    ciphertextChunk: Uint8Array,
  ): Promise<string>;
  getEnvironment(environmentUuid: Uint8Array): Promise<any>;
  anchorMemo(environmentUuid: Uint8Array, blake3Hex: string): Promise<string>;
  registerPqIdentity(envType?: number): Promise<{ /* same as registerPqOnchain */ }>;
}
```

### Encoding rules

| Argument | SDK type | ethers encoding |
|----------|----------|-----------------|
| uuid / memory / state id | `Uint8Array` length 16 | `ethers.hexlify` → `bytes16` |
| 32-byte hash | `Uint8Array` length 32 | `hexlify` → `bytes32` |
| ML-DSA sig | `Uint8Array` | passed as `bytes` (not hexlified as 32) |
| ciphertext chunk | `Uint8Array` | `bytes` |
| envType / role | `number` | `uint8` |
| maxAmount / amount | `bigint` | `uint256` wei |
| periodSecs | `number` | `uint64` |
| toolName | `string` | Solidity `string` |
| allowed | `boolean` | `bool` |
| chunkIndex | `number` | `uint16` |

Return value of each write is the **receipt hash** (`string`), after `tx.wait()`.

### Lifecycle

```mermaid
sequenceDiagram
    participant App
    participant EA as EvmAnchor
    participant RPC as Robinhood RPC
    participant C as Veya.sol

    App->>EA: registerEnvironment(...)
    EA->>RPC: eth_chainId
    RPC-->>EA: 0xb636
    EA->>C: registerEnvironment calldata
    C-->>RPC: receipt
    RPC-->>EA: hash
    EA-->>App: 0x...
```

`ensureRobinhoodChain` runs once per instance (`networkChecked`). The provider is **not** constructed with `staticNetwork`, so `getNetwork()` actually queries `eth_chainId`.

`getEnvironment` is a view: `contract.environments(hexlify(uuid))`. Tuple shape matches the Solidity `Environment` struct (see below).

---

## InstructionName

Veya.sol function names are **camelCase**. The SDK does not export snake_case instruction names.

```typescript
const INSTRUCTION_NAMES = [
  "registerEnvironment",
  "registerAgent",
  "attestExecution",
  "anchorPqAttestation",
  "storeCommitment",
  "initSpendingLimit",
  "recordSpend",
  "defineToolPolicy",
  "flagMemoryNullifier",
  "storeSealedState",
] as const;

type InstructionName = (typeof INSTRUCTION_NAMES)[number];
```

`src/chain.test.ts` asserts every `InstructionName` exists on `VEYA_ABI` and that `"register_environment"` is **not** in the list.

`EvmAnchor` method names match `InstructionName` one-for-one, plus helpers `getEnvironment`, `anchorMemo`, `registerPqIdentity`, `ensureRobinhoodChain`, `explorerFor`.

---

## ABI exports

```typescript
declare const VEYA_ABI: InterfaceAbi;
declare const VEYA_BYTECODE: string;
declare const VEYA_CONTRACT_ADDRESS: "0x1a1Dc3c55550FCE9F70ef6cDEeF967c0b72a5d84";
```

`VEYA_ABI` is the compiled JSON ABI inlined so `@veya/sdk` does not depend on `@veya/program`. Keep it in lockstep with `robinhood/contracts/Veya.sol`.

Public ABI surface includes:

- Custom errors (see `VeyaSdkError` mapping)
- Events for each write
- The ten write functions
- Public mapping getters (`environments`, `agents`, …)
- Constants `MAX_MLDSA_SIG_LEN`, `MAX_SEALED_CHUNK`, `MAX_TOOL_NAME_LEN`

---

