# @veya/sdk — Official TypeScript Client

The official TypeScript SDK for the VEYA privacy protocol. Build verifiable, privacy-preserving AI agents on Solana with zero-knowledge memory, AES-256-GCM configuration encryption, decentralized consensus-based compute, and immutable on-chain audit trails.

**[Website](https://veyanet.tech)** | **[X (Twitter)](https://x.com/withveya)** | **[NPM](https://www.npmjs.com/package/@veya/sdk)** | **[GitHub](https://github.com/veyanet/veya-sdk)**

---

## What is VEYA?

VEYA is an infrastructure layer that solves the trust problem for autonomous AI agents. It provides a decentralized, verifiable execution layer where agent operations can be executed across a consensus fleet, verified, and anchored on the Solana blockchain without exposing sensitive internal state (prompts, configurations, or memory) to the public.

With the `@veya/sdk`, you can:
- **Deploy agents** with client-side encrypted configurations (AES-256-GCM)
- **Store memory** using a zero-knowledge registry where only SHA-256 hashes are transmitted
- **Execute operations** across a decentralized consensus-based validator node fleet
- **Anchor proofs** on Solana to create permanent, publicly verifiable audit trails

---

## Installation

```bash
npm install @veya/sdk
```

Requirements: Node.js 18+ or a modern browser environment.

---

## Documentation Index

The documentation is organized by feature area. We recommend starting with the Quickstart and Configuration guides.

### 🚀 Getting Started

| Guide | Description |
|---|---|
| [**Quickstart**](./quickstart.md) | Install, configure, and run your first API call |
| [**Configuration**](./configuration.md) | `VeyaConfig`, environment variables, and timeout settings |
| [**Authentication**](./authentication.md) | API key auth and Solana wallet JWT sign-in flow |
| [**Error Handling**](./error-handling.md) | `VeyaError`, HTTP status codes, and retry patterns |

### 🛠️ Core Resources

| Guide | Description |
|---|---|
| [**Environments & Agents**](./environments-and-agents.md) | Create environments, deploy agents, and manage spending limits |
| [**Memory**](./memory.md) | Zero-knowledge scoped memory — store and verify content hashes |
| [**Executions**](./executions.md) | Standard executions, spend tracking, and observability logs |
| [**Decentralized Compute**](./decentralized-compute.md) | Consensus-based multi-node execution and Solana anchoring |
| [**Proofs & Anchoring**](./proofs-and-anchoring.md) | Anchor content on Solana and verify proofs publicly |

### ⚙️ Integration & Security

| Guide | Description |
|---|---|
| [**Cryptography**](./crypto.md) | Client-side AES-256-GCM agent config encryption and hashing |
| [**Solana**](./solana.md) | PDA registration, unsigned attestation building, and cluster info |
| [**API Keys**](./api-keys.md) | Create, list, and revoke developer API keys programmatically |
| [**Types Reference**](./types-reference.md) | Full TypeScript interface definitions and enums |
| [**API Map**](./api-map.md) | Complete HTTP route map for every SDK method |
| [**Architecture**](./ARCHITECTURE.md) | SDK design rules, privacy model, and module layout |

---

## Quick Example

A minimal example deploying an agent with an encrypted configuration and executing a decentralized consensus task.

```typescript
import { Veya, encryptAgentConfig } from "@veya/sdk";

// 1. Initialize client
const veya = new Veya({
  apiUrl: process.env.VEYA_API_URL,
  apiKey: process.env.VEYA_API_KEY,
});

// 2. Encrypt private agent configuration locally
const { encryptedConfig, configIv } = await encryptAgentConfig(
  { internalKey: "sk_live_...", allowedRecipients: ["vault-a"] },
  process.env.AGENT_PASSPHRASE!
);

// 3. Deploy agent
const agent = await veya.agents.deploy(environmentId, {
  type: "finance",
  permissionConfig: { allowedTools: ["transfer"] },
  encryptedConfig,
  configIv,
});

// 4. Run decentralized compute execution and anchor to Solana
const result = await veya.compute.run(environmentId, {
  agentId: agent.id,
  eventType: "decentralized.task",
  payload: {
    task: "verify_ledger",
    params: { limit: 100 }
  },
  nodesCount: 3,
  commitResult: true, // Anchor on-chain
  spendLamports: 1000,
});

console.log("On-chain proof:", result.attestationTx);
console.log("Consensus reached:", result.consensus.consensusReached);
```

---

## Security Model

The `@veya/sdk` is designed around a strict zero-knowledge and client-side encryption architecture:

1. **No plaintext configs:** Agent configurations are encrypted locally using AES-256-GCM before transmission. The VEYA API never sees your API keys or private parameters.
2. **No plaintext memory:** Memory entries are hashed locally using SHA-256. The API stores only the hash, acting as a tamper-evident registry.
3. **No private key exposure:** Solana transactions are signed externally via wallet adapters. The SDK never asks for or manages your private keys.
4. **Decentralized consensus:** Verifiable executions run across a multi-node validator fleet where outputs must reach a threshold consensus and are validated via Ed25519 signatures before anchoring to Solana.

Read the [Architecture Document](./ARCHITECTURE.md) for a deep dive into the security guarantees.

---

## License

MIT License. See [LICENSE](../LICENSE) for full details.
