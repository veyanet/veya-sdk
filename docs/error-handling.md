# Error Handling — `VeyaError`, Status Codes & Recovery Patterns

Every error thrown by the `@veya/sdk` is an instance of `VeyaError`. Whether the failure is a network timeout, an invalid API key, a budget exceeded response, or a malformed request body — the SDK normalizes all of them into a single, predictable error class with consistent fields. You never need to handle raw `fetch` errors, HTTP response parsing failures, or `AbortController` abort events directly.

---

## `VeyaError` — The Universal SDK Error

### Fields

| Field | Type | Description |
|---|---|---|
| `message` | `string` | Human-readable error description |
| `status` | `number` | HTTP status code. `0` = network error, `408` = timeout |
| `code` | `string \| undefined` | Machine-readable error code from the API (if provided) |
| `data` | `unknown` | Raw response body for debugging — may be a JSON object or string |

### Imports

```ts
import { VeyaError, isVeyaError, VeyaErrorCodes } from "@veya/sdk";
```

### Basic Usage

```ts
import { Veya, isVeyaError } from "@veya/sdk";

const veya = new Veya({ apiUrl: process.env.VEYA_API_URL, apiKey: process.env.VEYA_API_KEY });

try {
  const environments = await veya.environments.list();
} catch (err) {
  if (isVeyaError(err)) {
    console.error("VEYA error:", err.message);
    console.error("HTTP status:", err.status);
    console.error("Error code:", err.code ?? "none");
    console.error("Raw response:", JSON.stringify(err.data, null, 2));
  } else {
    // Non-VEYA error — re-throw
    throw err;
  }
}
```

---

## `isVeyaError(err)` — Type Guard

`isVeyaError` narrows `unknown` to `VeyaError` without requiring `instanceof`. This is important in environments where module boundaries can cause `instanceof` checks to fail (e.g. bundlers with multiple copies of the module, or cross-realm scenarios in certain Node.js setups).

```ts
import { isVeyaError } from "@veya/sdk";

function handleError(err: unknown): void {
  if (isVeyaError(err)) {
    // err is typed as VeyaError here
    switch (err.status) {
      case 401: return handleUnauthorized(err);
      case 402: return handleSpendingLimit(err);
      case 404: return handleNotFound(err);
      case 408: return handleTimeout(err);
      case 429: return handleRateLimit(err);
      default:  return handleGeneric(err);
    }
  }
  // Unknown error — do not swallow silently
  console.error("Unexpected non-VEYA error:", err);
  throw err;
}
```

---

## HTTP Status Code Reference

### `0` — Network Error

The request never reached the server. Common causes: no internet connection, DNS failure, CORS rejection in browser environments, firewall block.

```ts
try {
  await veya.health();
} catch (err) {
  if (isVeyaError(err) && err.status === 0) {
    console.error("Cannot reach VEYA API — check network connectivity.");
    console.error("Details:", err.message); // "Network error" or DNS message
  }
}
```

**Resolution:** Verify `VEYA_API_URL` is correct and reachable from the deployment environment. In browser contexts, verify CORS is configured on the VEYA API instance.

---

### `400` — Bad Request

The request body or query parameters failed server-side validation. The API returns details about which fields are invalid.

```ts
try {
  await veya.environments.create({
    name: "",       // empty name — validation failure
    type: "unknown" as any, // invalid type
  });
} catch (err) {
  if (isVeyaError(err) && err.status === 400) {
    console.error("Validation error:", err.message);
    console.error("Field details:", err.data); // { errors: [...] }
  }
}
```

**Common causes:**
- Empty or missing required fields (`name`, `type`)
- Invalid enum values (e.g. agent type not in the allowed list)
- Malformed UUIDs in path parameters
- `contentHash` that is not exactly 64 hex characters

---

### `401` — Unauthorized

The request was authenticated with an invalid, expired, or missing credential.

```ts
try {
  await veya.environments.list();
} catch (err) {
  if (isVeyaError(err) && err.status === 401) {
    if (err.message.includes("expired")) {
      // JWT has expired — re-authenticate with wallet
      await veya.authWithWallet({ wallet: pubkey, signMessage });
    } else {
      // API key is invalid or revoked
      console.error("Invalid API key. Verify VEYA_API_KEY value.");
    }
  }
}
```

**Common causes:**
- `apiKey` value is incorrect, revoked, or belongs to a different account
- JWT has expired (wallet tokens expire after 24 hours)
- Auth header is missing entirely (client constructed without credentials)
- Calling an authenticated route with an unauthenticated client instance

**Recovery — JWT re-authentication:**
```ts
import { isVeyaError } from "@veya/sdk";

async function withTokenRefresh<T>(
  fn: () => Promise<T>,
  refresh: () => Promise<void>
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (isVeyaError(err) && err.status === 401) {
      await refresh();
      return await fn(); // retry once after re-auth
    }
    throw err;
  }
}

// Usage
const envs = await withTokenRefresh(
  () => veya.environments.list(),
  () => veya.authWithWallet({ wallet: pubkey, signMessage })
);
```

---

### `402` — Payment Required (Spending Limit Exceeded)

The execution's `spendLamports` value would cause the environment's cumulative spend to exceed its configured `spendingLimits`.

```ts
try {
  await veya.protection.run(env.id, {
    agentId: agent.id,
    eventType: "treasury.transfer",
    payload: { amount: 1_000_000_000 }, // 1 SOL
    discloseFields: ["amount"],
    sealFields: [],
    commitResult: true,
    spendLamports: 1_000_000_000,
  });
} catch (err) {
  if (isVeyaError(err) && err.status === 402) {
    console.warn("Spending limit exceeded.");
    console.warn("Reduce spendLamports or update environment spending limits.");
    // Check current spend state:
    const env = await veya.environments.get(environmentId);
    console.log("Current limits:", env.spendingLimits);
  }
}
```

**Resolution:**
```ts
// Option A — reduce the spend amount
await veya.protection.run(env.id, { ...params, spendLamports: 500_000_000 });

// Option B — raise the limit
await veya.environments.update(env.id, {
  spendingLimits: {
    finance: { maxSolPerPeriod: 5, periodHours: 24 },
  },
});
```

---

### `403` — Forbidden

The authenticated credential does not have permission to perform the requested action.

```ts
try {
  await veya.apiKeys.revoke(someKeyId);
} catch (err) {
  if (isVeyaError(err) && err.status === 403) {
    console.error("Permission denied. Possible causes:");
    console.error("  - Scoped API key accessing a different environment");
    console.error("  - Attempting to revoke a key not owned by this account");
    console.error("  - Dev-tier key performing a live-only operation");
  }
}
```

**Common causes:**
- A key scoped to `environmentId: env_A` making requests against `env_B`
- Attempting to delete resources that belong to a different account
- API key tier restrictions (dev keys cannot perform certain live-only operations)

---

### `404` — Not Found

The requested resource does not exist. The ID may be incorrect, the resource may have been deleted, or it may not be owned by the authenticated account.

```ts
try {
  const env = await veya.environments.get("env_nonexistent");
} catch (err) {
  if (isVeyaError(err) && err.status === 404) {
    console.error("Environment not found:", err.message);
    // List all environments to find the correct ID
    const all = await veya.environments.list();
    console.log("Available environments:", all.map((e) => `${e.id} — ${e.name}`));
  }
}
```

**Common causes:**
- Typo in resource ID
- Resource was deleted or archived
- Resource belongs to a different account (returns 404 to prevent enumeration)

---

### `408` — Request Timeout

The request exceeded the configured `timeoutMs` (default: 30 seconds). The `AbortController` fired before a response was received.

```ts
try {
  await veya.proofs.anchorContent({ label: "audit", content: "..." });
} catch (err) {
  if (isVeyaError(err) && err.status === 408) {
    console.error("Request timed out — Solana network may be congested.");
    // Retry with a longer timeout
    const slowVeya = new Veya({
      apiUrl: process.env.VEYA_API_URL,
      apiKey: process.env.VEYA_API_KEY,
      timeoutMs: 90_000, // 90 seconds for Solana operations
    });
    await slowVeya.proofs.anchorContent({ label: "audit", content: "..." });
  }
}
```

**Operations most likely to timeout:**
- `proofs.anchorContent()` — involves Solana transaction broadcast
- `protection.run()` with `commitResult: true` — involves on-chain anchoring
- `solana.confirmEnvironmentRegistration()` — waits for transaction confirmation

**Recommended timeouts:**
| Operation | Suggested `timeoutMs` |
|---|---|
| Standard REST reads | `10_000` – `15_000` |
| Standard REST writes | `15_000` – `30_000` |
| Solana anchoring / confirmation | `60_000` – `90_000` |

---

### `409` — Conflict

A duplicate resource creation was attempted, or a concurrent write produced a conflict.

```ts
try {
  await veya.apiKeys.create({ name: "ci-pipeline", tier: "dev" });
} catch (err) {
  if (isVeyaError(err) && err.status === 409) {
    console.warn("Conflict — resource may already exist.");
    // List existing keys to find the duplicate
    const keys = await veya.apiKeys.list();
    const existing = keys.find((k) => k.name === "ci-pipeline");
    console.log("Existing key:", existing?.prefix);
  }
}
```

---

### `429` — Rate Limited

Too many requests were made in a short window. The API is throttling your client.

```ts
import { isVeyaError } from "@veya/sdk";

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (isVeyaError(err) && err.status === 429 && attempt < maxRetries) {
        const backoffMs = Math.pow(2, attempt) * 1000; // exponential backoff
        console.warn(`Rate limited. Retrying in ${backoffMs}ms... (attempt ${attempt}/${maxRetries})`);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      } else {
        throw err;
      }
    }
  }
  throw new Error("Max retries exceeded");
}

// Usage
const envs = await withRetry(() => veya.environments.list());
```

**Backoff schedule:**
| Attempt | Wait Before Retry |
|---|---|
| 1st retry | 2 seconds |
| 2nd retry | 4 seconds |
| 3rd retry | 8 seconds |

---

### `500` — Internal Server Error

An unexpected error occurred on the VEYA API server. These are rare and indicate a server-side problem.

```ts
try {
  await veya.environments.create({ name: "Test", type: "research" });
} catch (err) {
  if (isVeyaError(err) && err.status === 500) {
    console.error("VEYA API server error. Please try again or contact support.");
    console.error("Request ID (if present):", (err.data as any)?.requestId);
  }
}
```

---

## `VeyaErrorCodes` — Machine-Readable Codes

The `VeyaErrorCodes` export provides typed constants for the `code` field on `VeyaError`. Use these instead of string literals to make error handling typo-safe and refactor-friendly.

```ts
import { VeyaErrorCodes, isVeyaError } from "@veya/sdk";

try {
  await veya.protection.run(env.id, { ...params });
} catch (err) {
  if (!isVeyaError(err)) throw err;

  switch (err.code) {
    case VeyaErrorCodes.LIMIT_EXCEEDED:
      console.warn("Daily spending cap reached.");
      break;
    case VeyaErrorCodes.INVALID_SIGNATURE:
      console.error("Wallet signature verification failed.");
      break;
    case VeyaErrorCodes.AGENT_NOT_IN_ROSTER:
      console.error("Agent is not registered in this environment.");
      break;
    default:
      console.error("Unhandled error code:", err.code ?? "none");
  }
}
```

---

## Comprehensive Error Handler Pattern

A production-ready centralized error handler for VEYA operations:

```ts
import { isVeyaError, VeyaError } from "@veya/sdk";

type ErrorHandlerOptions = {
  onUnauthorized?: (err: VeyaError) => Promise<void>;
  onSpendingLimit?: (err: VeyaError) => void;
  onNotFound?: (err: VeyaError) => void;
  onTimeout?: (err: VeyaError) => void;
  onRateLimit?: (err: VeyaError) => Promise<void>;
};

async function handleVeyaError(
  err: unknown,
  options: ErrorHandlerOptions = {}
): Promise<void> {
  if (!isVeyaError(err)) throw err;

  switch (err.status) {
    case 401:
      if (options.onUnauthorized) await options.onUnauthorized(err);
      else throw err;
      break;
    case 402:
      if (options.onSpendingLimit) options.onSpendingLimit(err);
      else throw err;
      break;
    case 404:
      if (options.onNotFound) options.onNotFound(err);
      else throw err;
      break;
    case 408:
      if (options.onTimeout) options.onTimeout(err);
      else throw err;
      break;
    case 429:
      if (options.onRateLimit) await options.onRateLimit(err);
      else throw err;
      break;
    default:
      throw err;
  }
}
```

---

## Related

- [configuration.md](./configuration.md) — Configuring `timeoutMs`
- [authentication.md](./authentication.md) — Handling `401` with JWT refresh
- [executions.md](./executions.md) — Handling `402` spending limit errors
- [api-map.md](./api-map.md) — HTTP routes and expected status codes per operation
