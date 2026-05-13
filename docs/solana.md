# Solana Integration — PDA Registration, Attestations & Cluster Info

`veya.solana` exposes VEYA's direct Solana infrastructure layer. It provides three categories of functionality: **cluster information** (what network the API is operating on), **PDA registration** (giving environments and agents a deterministic on-chain identity), and **unsigned attestation building** (constructing SPL Memo transactions for external wallet signing without routing through the VEYA relayer).

This module is for developers who need to interact with VEYA's on-chain presence directly — either to register resources on-chain, to build attestation transactions signed by their own wallet, or to inspect the active Solana configuration.

---

## Why PDAs?

Program Derived Addresses (PDAs) are deterministic Solana account addresses derived from a seed and a program ID. They don't have a private key — instead, they're "owned" by a program. VEYA uses PDAs to give environments and agents a verifiable on-chain identity that:

- Is unique and deterministic per resource ID
- Is tied to the VEYA on-chain program
- Can be referenced by any Solana program or wallet without requiring a private key
- Persists independently of the VEYA API — even if VEYA's servers are down, the on-chain record exists

Registering an environment or agent as a PDA is optional but recommended for production deployments requiring maximum verifiability.

---

## Methods

### `solana.cluster()`

Returns the Solana cluster configuration that the VEYA API is currently operating on. Always call this first when building any Solana-dependent integration to confirm you are targeting the correct network.

**Signature:**
```ts
cluster(): Promise<SolanaClusterInfo>
```

**Result type:**
```ts
type SolanaClusterInfo = {
  cluster: string;    // "mainnet-beta" | "devnet" | "testnet"
  rpcUrl: string;     // The RPC endpoint the VEYA API uses
  programId: string;  // The VEYA on-chain program address
};
```

**Example:**
```ts
import { Veya } from "@veya/sdk";

const veya = new Veya({
  apiUrl: process.env.VEYA_API_URL,
  apiKey: process.env.VEYA_API_KEY,
});

const { cluster, rpcUrl, programId } = await veya.solana.cluster();

console.log("Cluster  :", cluster);   // "devnet"
console.log("RPC URL  :", rpcUrl);    // "https://api.devnet.solana.com"
console.log("Program  :", programId); // "VeyA1111111111111111111111111111111111111111"
```

**HTTP:**
```bash
curl "$VEYA_API_URL/v1/solana/cluster" \
  -H "X-Api-Key: $VEYA_API_KEY"
```

**Guard against wrong network:**
```ts
const { cluster } = await veya.solana.cluster();

if (process.env.NODE_ENV === "production" && cluster !== "mainnet-beta") {
  throw new Error(`Expected mainnet-beta but VEYA API is on: ${cluster}. Aborting.`);
}

console.log(`Operating on Solana ${cluster} — safe to proceed.`);
```

---

### `solana.environmentRegistration(environmentId)`

Fetches an **unsigned** Solana transaction that, when signed and broadcast, registers the environment as a PDA on-chain. The SDK never signs or broadcasts this transaction — that responsibility belongs to your wallet adapter.

**Signature:**
```ts
environmentRegistration(environmentId: string): Promise<EnvironmentRegistrationResult>
```

**Result type:**
```ts
type EnvironmentRegistrationResult = {
  registration: string;       // Base64-encoded unsigned Solana transaction
  environment: Environment;   // The VEYA environment record
};
```

**Example — with Solana wallet adapter:**
```ts
import { Connection, Transaction } from "@solana/web3.js";

const { registration, environment } = await veya.solana.environmentRegistration(env.id);

console.log("Registering environment:", environment.name);

// Decode the unsigned transaction
const txBuffer = Buffer.from(registration, "base64");
const transaction = Transaction.from(txBuffer);

// Sign with your wallet adapter (Phantom, Backpack, etc.)
const connection = new Connection(rpcUrl, "confirmed");
const signature = await walletAdapter.sendTransaction(transaction, connection);

console.log("Environment PDA registration TX:", signature);

// Confirm with VEYA API
const { environmentPda } = await veya.solana.confirmEnvironmentRegistration(env.id, signature);
console.log("Environment PDA address:", environmentPda);
```

**HTTP:**
```bash
curl "$VEYA_API_URL/v1/solana/environments/env_01HXYZ/registration" \
  -H "X-Api-Key: $VEYA_API_KEY"
```

---

### `solana.confirmEnvironmentRegistration(environmentId, transactionSignature)`

Notifies the VEYA API that the environment PDA registration transaction was successfully signed and broadcast. The API validates the transaction on-chain, derives the PDA address from the transaction data, and updates the environment record.

**Signature:**
```ts
confirmEnvironmentRegistration(
  environmentId: string,
  transactionSignature: string
): Promise<ConfirmRegistrationResult>
```

**Result type:**
```ts
type ConfirmRegistrationResult = {
  ok: boolean;
  environmentPda: string;   // The derived on-chain PDA address
  signature: string;        // The confirmed transaction signature
};
```

**Example:**
```ts
const { ok, environmentPda, signature } = await veya.solana.confirmEnvironmentRegistration(
  env.id,
  transactionSignature
);

if (ok) {
  console.log("Environment registered on-chain:");
  console.log("  PDA        :", environmentPda);
  console.log("  TX         :", signature);
  console.log("  Explorer   :", `https://explorer.solana.com/tx/${signature}`);
}
```

**HTTP:**
```bash
curl -X POST "$VEYA_API_URL/v1/solana/environments/env_01HXYZ/confirm-registration" \
  -H "X-Api-Key: $VEYA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"transactionSignature": "5W8k9LpXxyz..."}'
```

---

### `solana.agentRegistration(agentId)`

Fetches an unsigned Solana transaction for registering an agent as a PDA on-chain. Follows the same pattern as `environmentRegistration`.

**Signature:**
```ts
agentRegistration(agentId: string): Promise<AgentRegistrationResult>
```

**Result type:**
```ts
type AgentRegistrationResult = {
  registration: string;   // Base64-encoded unsigned Solana transaction
  agent: Agent;           // The VEYA agent record
};
```

**Example:**
```ts
const { registration, agent } = await veya.solana.agentRegistration(agent.id);

console.log("Registering agent:", agent.type, "—", agent.id);

const txBuffer = Buffer.from(registration, "base64");
const transaction = Transaction.from(txBuffer);
const signature = await walletAdapter.sendTransaction(transaction, connection);

console.log("Agent registration TX:", signature);
```

**HTTP:**
```bash
curl "$VEYA_API_URL/v1/solana/agents/agent_01HABC/registration" \
  -H "X-Api-Key: $VEYA_API_KEY"
```

---

### `solana.confirmAgentRegistration(agentId, transactionSignature)`

Confirms the agent PDA registration transaction with the VEYA API.

**Signature:**
```ts
confirmAgentRegistration(
  agentId: string,
  transactionSignature: string
): Promise<{ ok: boolean; agentPda: string }>
```

**Example:**
```ts
const { ok, agentPda } = await veya.solana.confirmAgentRegistration(
  agent.id,
  transactionSignature
);

if (ok) {
  console.log("Agent PDA address:", agentPda);
  console.log("Explorer         :", `https://explorer.solana.com/address/${agentPda}`);
}
```

**HTTP:**
```bash
curl -X POST "$VEYA_API_URL/v1/solana/agents/agent_01HABC/confirm-registration" \
  -H "X-Api-Key: $VEYA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"transactionSignature": "5W8k9LpXxyz..."}'
```

---

### `solana.buildUnsignedAttestation(executionPayload, feePayer)`

Builds an unsigned SPL Memo attestation transaction where **you** are the fee payer (not the VEYA relayer). Use this when you want to anchor execution data on Solana using your own wallet's gas rather than VEYA's relayer, or when you need the fee payer to be a specific known wallet for compliance reasons.

The returned `serialized` field is a base64-encoded `VersionedTransaction` ready for external signing.

**Signature:**
```ts
buildUnsignedAttestation(
  executionPayload: Record<string, unknown>,
  feePayer: string   // base58 Solana public key
): Promise<UnsignedAttestationResult>
```

**Result type:**
```ts
type UnsignedAttestationResult = {
  hash: string;        // SHA-256 hex of the payload
  serialized: string;  // Base64-encoded unsigned VersionedTransaction
  uri: string;         // VEYA attestation URI
};
```

**Example — with Solana web3.js:**
```ts
import { Connection, VersionedTransaction } from "@solana/web3.js";

const { cluster, rpcUrl } = await veya.solana.cluster();

const { hash, serialized, uri } = await veya.solana.buildUnsignedAttestation(
  {
    action: "treasury.transfer",
    amount: 500_000_000,
    from: "vault-a",
    to: "vault-b",
    agentId: agent.id,
    timestamp: new Date().toISOString(),
  },
  walletAdapter.publicKey.toBase58()
);

console.log("Payload hash :", hash);
console.log("Attestation  :", uri);

// Deserialize and sign
const txBytes = Buffer.from(serialized, "base64");
const transaction = VersionedTransaction.deserialize(txBytes);

// Sign and broadcast with your own wallet
const connection = new Connection(rpcUrl, "confirmed");
const signature = await walletAdapter.sendTransaction(transaction, connection);

console.log("Attestation TX:", signature);
console.log("Explorer      :", `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`);
```

**When to use `buildUnsignedAttestation` vs `proofs.anchorContent`:**

| | `proofs.anchorContent()` | `solana.buildUnsignedAttestation()` |
|---|---|---|
| Who pays gas | VEYA relayer | Your wallet |
| Signing | VEYA relayer wallet | Your wallet adapter |
| Plaintext sent to API | ✅ Yes — API hashes content | ✅ Yes — payload hashed server-side |
| Use case | Simple proof anchoring | Self-custodied attestations |
| Fee payer is your key | ❌ No | ✅ Yes |

---

## Complete PDA Registration Workflow

A complete, end-to-end workflow for registering both an environment and its agent on-chain:

```ts
import { Veya } from "@veya/sdk";
import { Connection, Transaction } from "@solana/web3.js";

async function registerOnChain(
  veya: Veya,
  environmentId: string,
  agentId: string,
  walletAdapter: any
) {
  // Step 1 — Confirm we're on the right network
  const { cluster, rpcUrl, programId } = await veya.solana.cluster();
  console.log(`Registering on Solana ${cluster} via program ${programId}`);

  const connection = new Connection(rpcUrl, "confirmed");

  // Step 2 — Register environment
  const { registration: envReg, environment } = await veya.solana.environmentRegistration(environmentId);
  console.log("Environment registration TX ready:", environment.name);

  const envTx = Transaction.from(Buffer.from(envReg, "base64"));
  const envSig = await walletAdapter.sendTransaction(envTx, connection);
  console.log("Environment TX broadcast:", envSig);

  await new Promise((resolve) => setTimeout(resolve, 3000)); // wait for confirmation

  const { environmentPda } = await veya.solana.confirmEnvironmentRegistration(environmentId, envSig);
  console.log("Environment PDA registered:", environmentPda);

  // Step 3 — Register agent
  const { registration: agentReg, agent } = await veya.solana.agentRegistration(agentId);
  console.log("Agent registration TX ready:", agent.type);

  const agentTx = Transaction.from(Buffer.from(agentReg, "base64"));
  const agentSig = await walletAdapter.sendTransaction(agentTx, connection);
  console.log("Agent TX broadcast:", agentSig);

  await new Promise((resolve) => setTimeout(resolve, 3000));

  const { agentPda } = await veya.solana.confirmAgentRegistration(agentId, agentSig);
  console.log("Agent PDA registered:", agentPda);

  return { environmentPda, agentPda };
}
```

---

## Timeout Considerations

Solana operations are network-dependent and can take longer than standard REST calls. Use a generous timeout for all `solana.*` methods, especially confirmation calls:

```ts
const solanaVeya = new Veya({
  apiUrl: process.env.VEYA_API_URL,
  apiKey: process.env.VEYA_API_KEY,
  timeoutMs: 90_000, // 90 seconds for Solana operations
});

// Use solanaVeya for all solana.* calls
const { environmentPda } = await solanaVeya.solana.confirmEnvironmentRegistration(
  env.id,
  signature
);
```

---

## Related

- [proofs-and-anchoring.md](./proofs-and-anchoring.md) — Higher-level proof anchoring via the VEYA relayer
- [protected-execution.md](./protected-execution.md) — On-chain commitment from protected executions
- [ARCHITECTURE.md](./ARCHITECTURE.md) — Solana integration mechanics in the SDK architecture
- [api-map.md](./api-map.md) — All Solana HTTP routes
