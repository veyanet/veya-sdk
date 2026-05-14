# Quickstart Guide — Building with VEYA

Welcome to the `@veya/sdk` Quickstart. This guide is designed to take you from zero to a fully operational, privacy-preserving AI agent integration on Solana in under 15 minutes. 

By the end of this tutorial, you will have built a script that:
1. Connects to the VEYA API securely.
2. Creates an isolated environment with a spending budget.
3. Encrypts and deploys a treasury agent.
4. Registers sensitive zero-knowledge memory context.
5. Executes a protected transaction in an enclave.
6. Anchors a verifiable proof of that transaction to the Solana blockchain.

---

## 1. Prerequisites

Before writing any code, ensure your local development environment is ready.

### Node.js
The SDK requires **Node.js 18 or higher** due to its use of modern web standards (`fetch`, `crypto`, `AbortController`).
```bash
node --version
# Should output v18.x.x or higher
```

### VEYA Credentials
You need an API key to communicate with the VEYA backend. 
- API keys start with `vya_dev_` (for development) or `vya_live_` (for production).
- You can generate a key from the VEYA developer dashboard.
- *(Alternatively, if you are building a frontend application, you can authenticate users dynamically using their Solana wallet. See the [Authentication Guide](./authentication.md) for wallet sign-in flows.)*

---

## 2. Project Setup

Initialize a new Node.js project and install the `@veya/sdk`. We recommend using TypeScript, as the SDK is heavily typed to prevent configuration errors.

```bash
# Initialize a new project
mkdir veya-quickstart
cd veya-quickstart
npm init -y

# Install the SDK and dotenv for environment variable management
npm install @veya/sdk dotenv

# Install TypeScript execution dependencies (optional but recommended)
npm install -D typescript tsx @types/node
```

### Configure Environment Variables

Create a `.env` file in the root of your project:

```bash
touch .env
```

Add your VEYA credentials to the `.env` file:

```env
# The base URL for the VEYA API (use the URL provided for your cluster)
VEYA_API_URL=https://api.veyanet.tech

# Your developer API key
VEYA_API_KEY=vya_dev_xxxxxxxxxxxxxxxxxxxxxxxx

# A strong, 32-character passphrase used to locally encrypt your agent's private config
AGENT_PASSPHRASE=my-super-secret-32-char-passphrase!
```

> [!WARNING]  
> Never commit your `.env` file to version control. Add `.env` to your `.gitignore` immediately. The `AGENT_PASSPHRASE` is the only way to decrypt your agent's configuration later — if you lose it, the VEYA API cannot recover it for you.

---

## 3. Client Initialization & Health Check

Create a new file named `quickstart.ts`. We will start by importing the SDK, loading our environment variables, and confirming we can talk to the VEYA servers.

```typescript
// quickstart.ts
import "dotenv/config";
import { Veya, isVeyaError } from "@veya/sdk";

async function main() {
  console.log("🚀 Starting VEYA Quickstart...\n");

  // Initialize the Veya client. 
  // It automatically reads VEYA_API_URL and VEYA_API_KEY from process.env.
  const veya = new Veya();

  try {
    // 1. Health Check
    console.log("📡 Connecting to VEYA API...");
    const health = await veya.health();
    console.log(`✅ API Status: ${health.status}`);
    console.log(`✅ API Version: ${health.version}`);

    // 2. Solana Cluster Check
    const clusterInfo = await veya.solana.cluster();
    console.log(`✅ Target Network: Solana ${clusterInfo.cluster}`);
    console.log(`✅ VEYA Program ID: ${clusterInfo.programId}\n`);

  } catch (error) {
    if (isVeyaError(error)) {
      console.error(`❌ VEYA API Error [${error.status}]: ${error.message}`);
    } else {
      console.error("❌ Unexpected Error:", error);
    }
    process.exit(1);
  }
}

main();
```

Run this file using `tsx` (TypeScript executor):
```bash
npx tsx quickstart.ts
```

If successful, you will see the API status and the Solana network (e.g., `devnet` or `mainnet-beta`) the API is targeting.

---

## 4. Creating an Environment

In VEYA, all resources are scoped to an **Environment**. Environments isolate workloads and enforce spending limits to ensure rogue agents cannot drain your wallets.

Add this code inside your `try` block in `quickstart.ts`:

```typescript
    // ... previous health check code

    console.log("🏗️  Creating new Treasury Environment...");
    const env = await veya.environments.create({
      name: "Quickstart Treasury Workload",
      type: "treasury",
      
      // Enforce a strict spending limit to prevent accidental losses
      spendingLimits: {
        finance: { 
          maxSolPerPeriod: 0.5, // Maximum 0.5 SOL can be spent...
          periodHours: 24       // ...every rolling 24-hour period
        }
      }
    });
    
    console.log(`✅ Environment created with ID: ${env.id}\n`);
```

---

## 5. Encrypting & Deploying an Agent

Now we will deploy a Treasury Agent into our new environment. 

VEYA enforces a strict zero-knowledge architecture. The configuration for your agent (which might contain sensitive API keys, allowed wallet addresses, or operational rules) must be encrypted **on your machine** before it is sent to the VEYA API.

Add the following code to encrypt and deploy the agent:

```typescript
    import { encryptAgentConfig } from "@veya/sdk"; // Add this to your imports at the top

    // ... previous environment code

    console.log("🤖 Encrypting and deploying Treasury Agent...");

    // This is the private configuration. It will NEVER be sent to the API in plaintext.
    const privateConfig = {
      internalRoutingKey: "sk_internal_998877",
      allowedRecipients: ["vault-alpha", "vault-beta"],
      maxTransferAmount: 1000000, // 0.001 SOL
      notes: "Quickstart demo agent"
    };

    // The SDK uses AES-256-GCM to encrypt the object locally.
    const passphrase = process.env.AGENT_PASSPHRASE;
    if (!passphrase) throw new Error("AGENT_PASSPHRASE is missing");

    const { encryptedConfig, configIv } = await encryptAgentConfig(
      privateConfig,
      passphrase
    );

    // Now we deploy the agent, sending only the opaque ciphertext.
    const agent = await veya.agents.deploy(env.id, {
      type: "finance",
      
      // Public permissions that the API can see and enforce
      permissionConfig: { 
        allowedTools: ["treasury.transfer", "treasury.query"] 
      },
      
      // The opaque ciphertext and initialization vector
      encryptedConfig,
      configIv,
    });

    console.log(`✅ Agent deployed with ID: ${agent.id}`);
    console.log(`🔒 Encrypted blob sent to API: ${encryptedConfig.substring(0, 30)}...\n`);
```

---

## 6. Storing Zero-Knowledge Memory

Agents need context to operate (system prompts, previous session logs, etc.). VEYA's Memory module allows you to store this context in a way where the API only receives a SHA-256 hash, acting as a tamper-evident registry without seeing the plaintext.

Let's store a system prompt for our new agent:

```typescript
    console.log("🧠 Registering Zero-Knowledge Memory...");

    const systemPrompt = "You are a conservative treasury agent. Only execute transfers to approved vault addresses. Flag all anomalous requests for human review.";

    // storeContent hashes the prompt locally. The raw text never leaves this process.
    const memory = await veya.memory.storeContent(
      env.id,
      "agent-system-prompts", // Scope/namespace
      systemPrompt,
      { agentId: agent.id }
    );

    console.log(`✅ Memory registered in scope 'agent-system-prompts'`);
    console.log(`✅ SHA-256 Content Hash: ${memory.contentHash}\n`);
```

If you later need to verify that your local prompt hasn't been tampered with, you can hash it locally again and compare it against the `contentHash` returned by the API.

---

## 7. Running a Protected Execution

Finally, we will simulate the agent executing a transfer. We will use a **Protected Execution**, which processes the payload inside a secure enclave. 

We will define:
- `discloseFields`: Data that is safe for the API to return in plaintext (e.g., the recipient address).
- `sealFields`: Data that must be hashed by the enclave and hidden (e.g., the exact transfer amount).
- `commitResult: true`: This tells the API to anchor a cryptographic proof of this execution to the Solana blockchain.

```typescript
    console.log("🛡️ Running Protected Execution...");

    const result = await veya.protection.run(env.id, {
      agentId: agent.id,
      eventType: "treasury.transfer",
      
      // The payload the agent generated
      payload: {
        to: "vault-beta",
        currency: "USDC",
        amount: 5000,             // Sensitive! We want to seal this.
        memo: "Q3 Vendor Payment" // Safe to disclose.
      },
      
      // Field routing instructions for the enclave
      discloseFields: ["to", "currency", "memo"],
      sealFields: ["amount"],
      
      // Anchor the result on-chain
      commitResult: true,
      
      // Lamports debited from the environment's spending budget
      spendLamports: 1000 
    });

    console.log(`✅ Execution completed. ID: ${result.execution.id}`);
    
    // Look closely at what the API returned:
    console.log(`👀 Disclosed data:`, result.disclosed); 
    // Notice that 'amount' is NOT in the disclosed data!

    console.log(`🔗 Commitment Hash: ${result.commitmentHash}`);
    console.log(`🔗 Solana Attestation TX: ${result.attestationTx}`);
    
    // The VEYA relayer paid the gas and broadcast an SPL Memo to Solana.
    // We can verify this publicly on an explorer:
    const cluster = clusterInfo.cluster === "mainnet-beta" ? "mainnet" : clusterInfo.cluster;
    console.log(`\n🎉 Verify your proof on-chain:`);
    console.log(`https://explorer.solana.com/tx/${result.attestationTx}?cluster=${cluster}\n`);
```

---

## Full Script Reference

Here is the complete `quickstart.ts` script assembled:

<details>
<summary><strong>Click to view the full script</strong></summary>

```typescript
import "dotenv/config";
import { Veya, encryptAgentConfig, isVeyaError } from "@veya/sdk";

async function main() {
  console.log("🚀 Starting VEYA Quickstart...\n");

  const veya = new Veya();

  try {
    // 1. Connectivity Check
    console.log("📡 Connecting to VEYA API...");
    const health = await veya.health();
    const clusterInfo = await veya.solana.cluster();
    console.log(`✅ API Status: ${health.status} on Solana ${clusterInfo.cluster}\n`);

    // 2. Create Environment
    console.log("🏗️  Creating new Treasury Environment...");
    const env = await veya.environments.create({
      name: "Quickstart Treasury Workload",
      type: "treasury",
      spendingLimits: { finance: { maxSolPerPeriod: 0.5, periodHours: 24 } }
    });
    console.log(`✅ Environment created: ${env.id}\n`);

    // 3. Encrypt and Deploy Agent
    console.log("🤖 Encrypting and deploying Treasury Agent...");
    const passphrase = process.env.AGENT_PASSPHRASE;
    if (!passphrase) throw new Error("AGENT_PASSPHRASE is missing");

    const { encryptedConfig, configIv } = await encryptAgentConfig(
      { internalRoutingKey: "sk_internal_998877", allowedRecipients: ["vault-alpha"] },
      passphrase
    );

    const agent = await veya.agents.deploy(env.id, {
      type: "finance",
      permissionConfig: { allowedTools: ["treasury.transfer"] },
      encryptedConfig,
      configIv,
    });
    console.log(`✅ Agent deployed: ${agent.id}\n`);

    // 4. Register ZK Memory
    console.log("🧠 Registering Zero-Knowledge Memory...");
    const systemPrompt = "You are a conservative treasury agent...";
    const memory = await veya.memory.storeContent(env.id, "prompts", systemPrompt, { agentId: agent.id });
    console.log(`✅ Memory registered with hash: ${memory.contentHash}\n`);

    // 5. Protected Execution
    console.log("🛡️ Running Protected Execution...");
    const result = await veya.protection.run(env.id, {
      agentId: agent.id,
      eventType: "treasury.transfer",
      payload: { to: "vault-beta", amount: 5000, memo: "Demo Transfer" },
      discloseFields: ["to", "memo"],
      sealFields: ["amount"],
      commitResult: true,
      spendLamports: 1000 
    });

    console.log(`✅ Execution complete: ${result.execution.id}`);
    console.log(`👀 Disclosed:`, result.disclosed);
    
    const clusterQuery = clusterInfo.cluster === "mainnet-beta" ? "" : `?cluster=${clusterInfo.cluster}`;
    console.log(`\n🎉 View your on-chain proof:`);
    console.log(`https://explorer.solana.com/tx/${result.attestationTx}${clusterQuery}\n`);

  } catch (error) {
    if (isVeyaError(error)) {
      console.error(`❌ VEYA Error [${error.status}]: ${error.message}`);
    } else {
      console.error("❌ Unexpected Error:", error);
    }
    process.exit(1);
  }
}

main();
```
</details>

---

## Next Steps

Congratulations! You have successfully executed a full lifecycle of a privacy-preserving agent on VEYA.

Where to go from here:

1. **Understand the Privacy Model**: Dive into [Architecture](./ARCHITECTURE.md) and [Cryptography](./crypto.md) to understand exactly how AES-256-GCM and SHA-256 protect your data.
2. **Handle Errors properly**: Read [Error Handling](./error-handling.md) to learn how to deal with rate limits (`429`) and spending cap violations (`402`).
3. **Advanced Solana Integration**: Learn how to register your environments and agents as PDAs (Program Derived Addresses) in the [Solana Guide](./solana.md).
4. **Wallet Authentication**: If you are building a frontend app, learn how to authenticate users using their Phantom or Backpack wallet in the [Authentication Guide](./authentication.md).
