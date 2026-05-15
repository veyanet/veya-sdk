# API Map — Full HTTP Route Reference for `@veya/sdk`

This document maps every method in `@veya/sdk` to its underlying HTTP route, authentication requirement, and request/response contract. Use it as a quick reference when debugging raw API calls, writing curl tests, or building integrations outside of the SDK.

All paths are relative to your `VEYA_API_URL` — default `https://api.veyanet.tech`. The SDK resolves this automatically from the `apiUrl` config field or the `VEYA_API_URL` environment variable.

---

## Authentication Legend

| Symbol | Header Sent | When Used |
|---|---|---|
| **None** | _(no auth header)_ | Public routes — health, auth nonce/verify, proof verification |
| **Key** | `X-Api-Key: <key>` | Server-side API key authentication |
| **JWT** | `Authorization: Bearer <token>` | Wallet sign-in JWT authentication |
| **Key / JWT** | Either of the above | Route accepts both methods — SDK picks based on config |

Most data routes accept **Key / JWT**. The SDK automatically sends the right header based on what was configured at construction time. See [authentication.md](./authentication.md) for the full auth flow.

---

---

## Health

### `GET /health`

| SDK Method | HTTP | Auth |
|---|---|---|
| `veya.health()` | `GET` | None |

No authentication required. Use this to confirm API reachability and Solana relayer readiness before executing any agent operations.

**SDK:**
```ts
const health = await veya.health();
console.log(health.status);          // "ok"
console.log(health.database);        // "connected"
console.log(health.solana.cluster);  // "devnet" | "mainnet-beta"
console.log(health.solana.anchor.ready); // true | false
```

**curl:**
```bash
curl "$VEYA_API_URL/health"
```

**Response shape:**
```ts
{
  status: string;
  database: string;
  solana: {
    cluster: string;
    anchor: {
      configured: boolean;
      relayerPubkey: string | null;
      ready: boolean;
    };
  };
}
```

---

## Authentication

### `GET /auth/nonce` · `POST /auth/verify`

| SDK Method | HTTP | Path | Auth |
|---|---|---|---|
| `veya.authWithWallet(input)` | `GET` | `/auth/nonce?wallet=<PUBKEY>` | None |
| `veya.authWithWallet(input)` | `POST` | `/auth/verify` | None |

Both routes are public. The wallet sign-in flow executes them in sequence internally.

**SDK:**
```ts
const veya = new Veya({ apiUrl: "https://api.veyanet.tech" });

const session = await veya.authWithWallet({
  wallet: publicKey.toBase58(),
  signMessage: (bytes) => wallet.signMessage(bytes),
});

console.log(session.token);      // JWT string
console.log(session.expiresIn);  // "24h"
```

**Manual curl flow:**
```bash
# Step 1 — fetch nonce
curl "$VEYA_API_URL/auth/nonce?wallet=<PUBKEY>"
# { "message": "Sign in to VEYA: <nonce>" }

# Step 2 — sign the message with your wallet, then verify
curl -X POST "$VEYA_API_URL/auth/verify" \
  -H "Content-Type: application/json" \
  -d '{
    "wallet": "<PUBKEY>",
    "message": "Sign in to VEYA: <nonce>",
    "signature": "<BASE58_SIGNATURE>"
  }'
```

**`/auth/verify` response:**
```ts
{
  token: string;       // JWT — set via veya.setAccessToken(token)
  wallet: string;      // Solana public key
  tokenType: string;   // "Bearer"
  expiresIn: string;   // "24h"
}
```

---

## Environments

### `GET /v1/environments`

| SDK Method | HTTP | Auth |
|---|---|---|
| `veya.environments.list()` | `GET` | Key / JWT |

```ts
const envs = await veya.environments.list();
```

```bash
curl "$VEYA_API_URL/v1/environments" \
  -H "X-Api-Key: $VEYA_API_KEY"
```

**Response:** `{ environments: Environment[] }`

---

### `POST /v1/environments`

| SDK Method | HTTP | Auth |
|---|---|---|
| `veya.environments.create(input)` | `POST` | Key / JWT |

```ts
const env = await veya.environments.create({
  name: "Treasury Ops",
  type: "treasury",
  policyConfig: { maxAgents: 5 },
  spendingLimits: { finance: { maxSolPerPeriod: 1, periodHours: 24 } },
  agentRoster: [],
  memoryScope: {},
});
```

```bash
curl -X POST "$VEYA_API_URL/v1/environments" \
  -H "X-Api-Key: $VEYA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"Treasury Ops","type":"treasury"}'
```

**Input fields:**

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | Yes | Display name |
| `type` | `EnvironmentType` | Yes | `research`, `governance`, `treasury`, `contributor`, `protocol`, `desci` |
| `memoryScope` | `object` | No | Memory namespace configuration |
| `policyConfig` | `object` | No | Policy enforcement rules |
| `spendingLimits` | `object` | No | Budget caps per agent type and period |
| `agentRoster` | `string[]` | No | Pre-populated list of agent UUIDs |

**Response:** `{ environment: Environment }`

---

### `GET /v1/environments/:id`

| SDK Method | HTTP | Auth |
|---|---|---|
| `veya.environments.get(id)` | `GET` | Key / JWT |

```ts
const env = await veya.environments.get("env_01HXYZ");
```

```bash
curl "$VEYA_API_URL/v1/environments/env_01HXYZ" \
  -H "X-Api-Key: $VEYA_API_KEY"
```

**Response:** `{ environment: Environment }`

---

### `PATCH /v1/environments/:id`

| SDK Method | HTTP | Auth |
|---|---|---|
| `veya.environments.update(id, input)` | `PATCH` | Key / JWT |

All fields are optional. Only specified fields are updated.

```ts
await veya.environments.update(env.id, {
  status: "paused",
  spendingLimits: { finance: { maxSolPerPeriod: 2, periodHours: 24 } },
});
```

```bash
curl -X PATCH "$VEYA_API_URL/v1/environments/env_01HXYZ" \
  -H "X-Api-Key: $VEYA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"status":"paused"}'
```

**Response:** `{ environment: Environment }`

---

## Agents

### `GET /v1/environments/:id/agents`

| SDK Method | HTTP | Auth |
|---|---|---|
| `veya.agents.list(envId)` | `GET` | Key / JWT |

```ts
const agents = await veya.agents.list(env.id);
```

```bash
curl "$VEYA_API_URL/v1/environments/env_01HXYZ/agents" \
  -H "X-Api-Key: $VEYA_API_KEY"
```

**Response:** `{ agents: Agent[] }`

---

### `POST /v1/environments/:id/agents`

| SDK Method | HTTP | Auth |
|---|---|---|
| `veya.agents.deploy(envId, input)` | `POST` | Key / JWT |
| `veya.agents.deployEncrypted(envId, input)` | `POST` | Key / JWT |

```ts
import { encryptAgentConfig } from "@veya/sdk";

const { encryptedConfig, configIv } = await encryptAgentConfig(
  { allowedTools: ["transfer"], maxBudget: 500 },
  process.env.AGENT_PASSPHRASE!
);

const agent = await veya.agents.deploy(env.id, {
  type: "finance",
  permissionConfig: { allowedTools: ["transfer"] },
  encryptedConfig,
  configIv,
});
```

```bash
curl -X POST "$VEYA_API_URL/v1/environments/env_01HXYZ/agents" \
  -H "X-Api-Key: $VEYA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"type":"finance","permissionConfig":{"allowedTools":["transfer"]}}'
```

**Input fields:**

| Field | Type | Required | Description |
|---|---|---|---|
| `type` | `AgentType` | Yes | `research`, `coordination`, `memory`, `policy`, `presence`, `finance` |
| `permissionConfig` | `object` | Yes | Allowed tools and scope constraints |
| `encryptedConfig` | `string` | No | AES-256-GCM ciphertext of private agent configuration |
| `configIv` | `string` | No | Base64-encoded 12-byte IV paired with `encryptedConfig` |
| `agentKind` | `string` | No | Custom classification label for the agent |

**Response:** `{ agent: Agent }`

---

### `PATCH /v1/environments/:id/agents/:agentId`

| SDK Method | HTTP | Auth |
|---|---|---|
| `veya.agents.update(envId, agentId, input)` | `PATCH` | Key / JWT |

```ts
await veya.agents.update(env.id, agent.id, {
  status: "idle",
});
```

```bash
curl -X PATCH "$VEYA_API_URL/v1/environments/env_01HXYZ/agents/agent_01HABC" \
  -H "X-Api-Key: $VEYA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"status":"idle"}'
```

**Response:** `{ agent: Agent }`

---

## Memory

### `GET /v1/environments/:id/memory`

| SDK Method | HTTP | Auth |
|---|---|---|
| `veya.memory.list(envId, scope?)` | `GET` | Key / JWT |

```ts
const all = await veya.memory.list(env.id);
const scoped = await veya.memory.list(env.id, "agent-prompts");
```

```bash
# All entries
curl "$VEYA_API_URL/v1/environments/env_01HXYZ/memory" \
  -H "X-Api-Key: $VEYA_API_KEY"

# Scoped
curl "$VEYA_API_URL/v1/environments/env_01HXYZ/memory?scope=agent-prompts" \
  -H "X-Api-Key: $VEYA_API_KEY"
```

**Response:** `{ memory: MemoryEntry[] }`

---

### `POST /v1/environments/:id/memory`

| SDK Method | HTTP | Auth |
|---|---|---|
| `veya.memory.store(envId, input)` | `POST` | Key / JWT |
| `veya.memory.storeContent(envId, scope, content)` | `POST` | Key / JWT |

```ts
// Using storeContent — hashes locally, only hash is sent
const entry = await veya.memory.storeContent(
  env.id,
  "session-logs",
  "Connect to the primary database and retrieve user records.",
  { agentId: agent.id, metadata: { session: "abc123" } }
);

console.log(entry.contentHash); // SHA-256 hex digest
```

**Store input fields:**

| Field | Type | Required | Description |
|---|---|---|---|
| `scope` | `string` | Yes | Namespace string (1–64 chars) |
| `contentHash` | `string` | Yes | SHA-256 hex digest (64 chars) |
| `agentId` | `string` | No | Associated agent UUID |
| `metadata` | `object` | No | Arbitrary caller-defined metadata |

**Response:** `{ memory: MemoryEntry }`

---

### `DELETE /v1/environments/:id/memory/:memId`

| SDK Method | HTTP | Auth |
|---|---|---|
| `veya.memory.purge(envId, memoryId)` | `DELETE` | Key / JWT |

```ts
const { ok } = await veya.memory.purge(env.id, entry.id);
```

```bash
curl -X DELETE "$VEYA_API_URL/v1/environments/env_01HXYZ/memory/mem_01HDEF" \
  -H "X-Api-Key: $VEYA_API_KEY"
```

---

## Executions

### `GET /v1/environments/:id/executions`

| SDK Method | HTTP | Auth |
|---|---|---|
| `veya.executions.list(envId)` | `GET` | Key / JWT |

```ts
const executions = await veya.executions.list(env.id);
```

```bash
curl "$VEYA_API_URL/v1/environments/env_01HXYZ/executions" \
  -H "X-Api-Key: $VEYA_API_KEY"
```

**Response:** `{ executions: Execution[] }`

---

### `POST /v1/environments/:id/executions`

| SDK Method | HTTP | Auth |
|---|---|---|
| `veya.executions.create(envId, input)` | `POST` | Key / JWT |
| `veya.executions.runStandard(envId, params)` | `POST` | Key / JWT |

```ts
const exec = await veya.executions.runStandard(env.id, {
  eventType: "treasury.check",
  payload: { balance: 500, currency: "USDC" },
  agentId: agent.id,
  spendLamports: 0,
});
```

**Input fields:**

| Field | Type | Required | Description |
|---|---|---|---|
| `eventType` | `string` | Yes | Caller-defined label (e.g. `treasury.check`) |
| `payload` | `object` | Yes | Execution context data |
| `protected` | `boolean` | Yes | `false` for standard, `true` for enclave-shielded |
| `spendLamports` | `number` | Yes | Lamports to debit from budget |
| `agentId` | `string` | No | Associated agent UUID |

**Response:** `{ execution: Execution }`

---

## Protected Execution

### `POST /v1/environments/:id/executions/protected`

| SDK Method | HTTP | Auth |
|---|---|---|
| `veya.protection.run(envId, input)` | `POST` | Key / JWT |
| `veya.protection.runWithFieldLists(envId, params)` | `POST` | Key / JWT |

```ts
const result = await veya.protection.run(env.id, {
  agentId: agent.id,
  eventType: "treasury.transfer",
  payload: { amount: 100, currency: "USDC", to: "vault-address" },
  discloseFields: ["currency", "to"],
  sealFields: ["amount"],
  commitResult: true,
  spendLamports: 1000,
});

console.log(result.attestationTx);   // Solana tx signature
console.log(result.commitmentHash);  // SHA-256 commitment hash
console.log(result.disclosed);       // { currency: "USDC", to: "vault-address" }
```

```bash
curl -X POST "$VEYA_API_URL/v1/environments/env_01HXYZ/executions/protected" \
  -H "X-Api-Key: $VEYA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "agent_01HABC",
    "eventType": "treasury.transfer",
    "payload": { "amount": 100, "currency": "USDC" },
    "discloseFields": ["currency"],
    "sealFields": ["amount"],
    "commitResult": true,
    "spendLamports": 1000
  }'
```

**Input fields:**

| Field | Type | Required | Description |
|---|---|---|---|
| `agentId` | `string` | Yes | UUID of the executing agent |
| `eventType` | `string` | Yes | Event classification label |
| `payload` | `object` | Yes | Execution parameters |
| `discloseFields` | `string[]` | Yes | Payload keys to return in plaintext |
| `sealFields` | `string[]` | Yes | Payload keys to seal inside the enclave |
| `commitResult` | `boolean` | Yes | If `true`, anchors commitment hash on Solana |
| `spendLamports` | `number` | Yes | Lamports to debit from environment budget |

**Response shape:**
```ts
{
  execution: Execution;
  attestationTx?: string;      // Solana tx signature (if commitResult=true)
  commitmentHash?: string;     // SHA-256 hash of the execution result
  disclosed?: Record<string, unknown>; // Fields in discloseFields
}
```

---

## Decentralized Compute

### `POST /v1/environments/:id/executions/decentralized`

| SDK Method | HTTP | Auth |
|---|---|---|
| `veya.compute.run(envId, input)` | `POST` | Key / JWT |

```ts
const result = await veya.compute.run(env.id, {
  agentId: agent.id,
  eventType: "decentralized.oracle",
  payload: { pair: "SOL/USD" },
  nodesCount: 3,
  commitResult: true,
  spendLamports: 1000,
});

console.log(result.consensus.consensusReached); // true
console.log(result.consensus.stateHash);        // unified consensus state hash
console.log(result.attestationTx);              // Solana tx signature
```

```bash
curl -X POST "$VEYA_API_URL/v1/environments/env_01HXYZ/executions/decentralized" \
  -H "X-Api-Key: $VEYA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "agent_01HABC",
    "eventType": "decentralized.oracle",
    "payload": { "pair": "SOL/USD" },
    "nodesCount": 3,
    "commitResult": true,
    "spendLamports": 1000
  }'
```

**Input fields:**

| Field | Type | Required | Description |
|---|---|---|---|
| `agentId` | `string` | Yes | UUID of the executing agent |
| `eventType` | `string` | Yes | Event classification label |
| `payload` | `object` | Yes | Execution parameters |
| `nodesCount` | `number` | No | Number of nodes to execute task (defaults to 3) |
| `commitResult` | `boolean` | No | If `true`, anchors consensus state hash on Solana (defaults to true) |
| `spendLamports` | `number` | No | Lamports to debit from environment budget (defaults to 1000) |

**Response shape:**
```ts
{
  execution: Execution;
  consensus: {
    consensusReached: boolean;
    nodesCount: number;
    nodes: Array<{
      nodeId: string;
      publicKey: string;
      signature: string;
      status: "SUCCESS" | "FAILED";
    }>;
    stateHash: string;
  };
  attestationTx: string | null;      // Solana tx signature
}
```

---

## Proofs & Anchoring

### `GET /v1/proofs`

| SDK Method | HTTP | Auth |
|---|---|---|
| `veya.proofs.list()` | `GET` | Key / JWT |

```ts
const { anchors, agentProofs } = await veya.proofs.list();
```

```bash
curl "$VEYA_API_URL/v1/proofs" \
  -H "X-Api-Key: $VEYA_API_KEY"
```

---

### `POST /v1/proofs/anchor`

| SDK Method | HTTP | Auth |
|---|---|---|
| `veya.proofs.anchorContent(input)` | `POST` | Key / JWT |
| `veya.proofs.anchorText(label, content)` | `POST` | Key / JWT |

```ts
const { proof, explorerUrl, contentHash } = await veya.proofs.anchorContent({
  label: "Board vote — Q2 2025",
  content: "Proposal 42 passed unanimously by a 7-0 vote.",
});

console.log(explorerUrl); // https://explorer.solana.com/tx/...
```

```bash
curl -X POST "$VEYA_API_URL/v1/proofs/anchor" \
  -H "X-Api-Key: $VEYA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"label":"Board vote","content":"Proposal 42 passed."}'
```

**Input fields:**

| Field | Type | Required | Description |
|---|---|---|---|
| `label` | `string` | Yes | Human-readable identifier for the record |
| `content` | `string` | Yes | UTF-8 content to hash and anchor |

**Response:** `{ proof: ProofAnchor; explorerUrl: string; contentHash: string }`

---

### `GET /api/verify/:signature`

| SDK Method | HTTP | Auth |
|---|---|---|
| `veya.proofs.verifyTransaction(signature)` | `GET` | None |

Public route — no API key or JWT required.

```ts
const v = await veya.proofs.verifyTransaction("5W8k9LpXxyz...");
console.log(v.valid);        // true
console.log(v.hash);         // SHA-256 hex
console.log(v.explorerUrl);  // Solana explorer link
console.log(v.registered?.label); // "Board vote — Q2 2025"
```

```bash
curl "$VEYA_API_URL/api/verify/5W8k9LpXxyz..."
```

**Response:** `VerifyProofResult` — see [types-reference.md](./types-reference.md).

---

## Solana

### `GET /v1/solana/cluster`

| SDK Method | HTTP | Auth |
|---|---|---|
| `veya.solana.cluster()` | `GET` | Key / JWT |

```ts
const { cluster, rpcUrl, programId } = await veya.solana.cluster();
```

**Response:** `{ cluster: string; rpcUrl: string; programId: string }`

---

### `GET /v1/solana/environments/:id/registration`

| SDK Method | HTTP | Auth |
|---|---|---|
| `veya.solana.environmentRegistration(envId)` | `GET` | Key / JWT |

Fetches the unsigned transaction needed to register an environment PDA on-chain.

```ts
const { registration, environment } = await veya.solana.environmentRegistration(env.id);
// Pass `registration` to your wallet adapter to build and sign the transaction
```

---

### `POST /v1/solana/environments/:id/confirm-registration`

| SDK Method | HTTP | Auth |
|---|---|---|
| `veya.solana.confirmEnvironmentRegistration(envId, sig)` | `POST` | Key / JWT |

```ts
const { ok, environmentPda } = await veya.solana.confirmEnvironmentRegistration(
  env.id,
  transactionSignature
);
console.log(environmentPda); // The on-chain PDA address
```

**Request body:** `{ transactionSignature: string }`

---

### `GET /v1/solana/agents/:id/registration`

| SDK Method | HTTP | Auth |
|---|---|---|
| `veya.solana.agentRegistration(agentId)` | `GET` | Key / JWT |

```ts
const { registration, agent } = await veya.solana.agentRegistration(agent.id);
```

---

### `POST /v1/solana/agents/:id/confirm-registration`

| SDK Method | HTTP | Auth |
|---|---|---|
| `veya.solana.confirmAgentRegistration(agentId, sig)` | `POST` | Key / JWT |

```ts
const { ok, agentPda } = await veya.solana.confirmAgentRegistration(
  agent.id,
  transactionSignature
);
```

**Request body:** `{ transactionSignature: string }`

---

### `POST /v1/solana/attestation/unsigned`

| SDK Method | HTTP | Auth |
|---|---|---|
| `veya.solana.buildUnsignedAttestation(payload, feePayer)` | `POST` | Key / JWT |

Builds an unsigned SPL Memo attestation transaction for external wallet signing.

```ts
const { hash, serialized, uri } = await veya.solana.buildUnsignedAttestation(
  { amount: 1, action: "treasury.transfer" },
  walletPublicKey
);
// Decode `serialized` (base64), sign with wallet, then broadcast
```

**Request body:** `{ executionPayload: object; feePayer: string }`

**Response:** `{ hash: string; serialized: string; uri: string }`

---

## API Keys

### `GET /v1/api-keys`

| SDK Method | HTTP | Auth |
|---|---|---|
| `veya.apiKeys.list()` | `GET` | Key / JWT |

```ts
const keys = await veya.apiKeys.list();
```

**Response:** `{ apiKeys: ApiKeyRow[] }`

---

### `POST /v1/api-keys`

| SDK Method | HTTP | Auth |
|---|---|---|
| `veya.apiKeys.create(input)` | `POST` | Key / JWT |

```ts
const { apiKey, warning } = await veya.apiKeys.create({ name: "ci", tier: "dev" });
```

**Input:** `{ name: string; tier: "dev" | "live"; environmentId?: string }`

**Response:** `{ apiKey: { id, key, prefix, tier }; warning: string }`

---

### `DELETE /v1/api-keys/:id`

| SDK Method | HTTP | Auth |
|---|---|---|
| `veya.apiKeys.revoke(id)` | `DELETE` | Key / JWT |

```ts
await veya.apiKeys.revoke(keyId);
```

**Response:** `{ ok: boolean }`

---

## Full Route Index

| Method | Path | Auth | SDK |
|---|---|---|---|
| `GET` | `/health` | None | `veya.health()` |
| `GET` | `/auth/nonce` | None | `veya.authWithWallet()` |
| `POST` | `/auth/verify` | None | `veya.authWithWallet()` |
| `GET` | `/v1/environments` | Key/JWT | `veya.environments.list()` |
| `POST` | `/v1/environments` | Key/JWT | `veya.environments.create()` |
| `GET` | `/v1/environments/:id` | Key/JWT | `veya.environments.get()` |
| `PATCH` | `/v1/environments/:id` | Key/JWT | `veya.environments.update()` |
| `GET` | `/v1/environments/:id/agents` | Key/JWT | `veya.agents.list()` |
| `POST` | `/v1/environments/:id/agents` | Key/JWT | `veya.agents.deploy()` |
| `PATCH` | `/v1/environments/:id/agents/:agentId` | Key/JWT | `veya.agents.update()` |
| `GET` | `/v1/environments/:id/memory` | Key/JWT | `veya.memory.list()` |
| `POST` | `/v1/environments/:id/memory` | Key/JWT | `veya.memory.store()` |
| `DELETE` | `/v1/environments/:id/memory/:memId` | Key/JWT | `veya.memory.purge()` |
| `GET` | `/v1/environments/:id/executions` | Key/JWT | `veya.executions.list()` |
| `POST` | `/v1/environments/:id/executions` | Key/JWT | `veya.executions.create()` |
| `POST` | `/v1/environments/:id/executions/protected` | Key/JWT | `veya.protection.run()` |
| `GET` | `/v1/proofs` | Key/JWT | `veya.proofs.list()` |
| `POST` | `/v1/proofs/anchor` | Key/JWT | `veya.proofs.anchorContent()` |
| `GET` | `/api/verify/:signature` | None | `veya.proofs.verifyTransaction()` |
| `GET` | `/v1/api-keys` | Key/JWT | `veya.apiKeys.list()` |
| `POST` | `/v1/api-keys` | Key/JWT | `veya.apiKeys.create()` |
| `DELETE` | `/v1/api-keys/:id` | Key/JWT | `veya.apiKeys.revoke()` |
| `GET` | `/v1/solana/cluster` | Key/JWT | `veya.solana.cluster()` |
| `GET` | `/v1/solana/environments/:id/registration` | Key/JWT | `veya.solana.environmentRegistration()` |
| `POST` | `/v1/solana/environments/:id/confirm-registration` | Key/JWT | `veya.solana.confirmEnvironmentRegistration()` |
| `GET` | `/v1/solana/agents/:id/registration` | Key/JWT | `veya.solana.agentRegistration()` |
| `POST` | `/v1/solana/agents/:id/confirm-registration` | Key/JWT | `veya.solana.confirmAgentRegistration()` |
| `POST` | `/v1/solana/attestation/unsigned` | Key/JWT | `veya.solana.buildUnsignedAttestation()` |
