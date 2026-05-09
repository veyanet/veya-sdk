# Configuration — `VeyaConfig`, Environment Variables & Client Setup

Every `Veya` client instance is driven by a `VeyaConfig` object resolved at construction time. The configuration governs the API base URL, authentication credentials, and request timeout behaviour. All fields are optional — the SDK fills missing values from environment variables or hardcoded defaults, making zero-argument construction possible in well-configured environments.

---

## `VeyaConfig` Type

```ts
export type VeyaConfig = {
  /** Base URL of the VEYA API backend. Trailing slashes are stripped automatically. */
  apiUrl: string;

  /** Server-side API key — vya_dev_… or vya_live_… Sent as X-Api-Key header. */
  apiKey?: string;

  /** Bearer JWT from wallet sign-in. Sent as Authorization: Bearer header. */
  accessToken?: string;

  /** Fetch abort timeout in milliseconds. Default: 30000 (30 seconds). */
  timeoutMs?: number;
};
```

---

## Resolution Order

When you construct a `Veya` instance, `resolveConfig()` applies the following priority chain for each field:

### `apiUrl`

```
1. options.apiUrl (explicit argument)
2. process.env.VEYA_API_URL
3. "https://api.veyanet.tech" (hardcoded fallback)
```

Trailing slashes on the resolved URL are always stripped:

```ts
// All three produce the same internal URL: "https://api.veyanet.tech"
new Veya({ apiUrl: "https://api.veyanet.tech/" })
new Veya({ apiUrl: "https://api.veyanet.tech" })
// VEYA_API_URL="https://api.veyanet.tech/" → strips to "https://api.veyanet.tech"
```

### `apiKey`

```
1. options.apiKey (explicit argument)
2. process.env.VEYA_API_KEY
```

There is no hardcoded fallback for `apiKey`. If neither is provided, the client starts unauthenticated. This is valid — you can still call public routes or authenticate later via wallet sign-in.

### `accessToken`

```
1. options.accessToken (explicit argument)
```

`accessToken` has no environment variable fallback. It is typically set programmatically after a wallet sign-in via `veya.setAccessToken(token)` or passed directly for restored sessions.

### `timeoutMs`

```
1. options.timeoutMs (explicit argument)
2. 30000 (hardcoded default — 30 seconds)
```

There is no environment variable fallback for `timeoutMs`. Configure it explicitly if your deployment requires a different timeout window.

---

## Construction Patterns

### Minimal — full env var resolution

```ts
import { Veya } from "@veya/sdk";

// Reads VEYA_API_URL and VEYA_API_KEY from process.env
const veya = new Veya();
```

This is the recommended pattern for server-side deployments where env vars are managed by the host environment (Docker, AWS ECS, Vercel, Railway, etc.).

### Explicit — all fields specified

```ts
const veya = new Veya({
  apiUrl: "https://api.veyanet.tech",
  apiKey: "vya_live_38a209c1-bfed-492a-a5f1-example",
  timeoutMs: 15_000,
});
```

Use this in tests or environments where you want full control and no reliance on ambient env vars.

### Mixed — explicit overrides with env fallback

```ts
const veya = new Veya({
  timeoutMs: 10_000, // override timeout only
  // apiUrl and apiKey still read from VEYA_API_URL and VEYA_API_KEY
});
```

### JWT-only — no API key

```ts
const veya = new Veya({
  apiUrl: "https://api.veyanet.tech",
  // No apiKey — will authenticate via wallet sign-in
});

await veya.authWithWallet({ wallet: pubkey, signMessage });
// Now authenticated via Bearer JWT
```

### Pre-seeded JWT — restored session

```ts
const storedToken = sessionStorage.getItem("veya_jwt");

const veya = new Veya({
  apiUrl: "https://api.veyanet.tech",
  accessToken: storedToken ?? undefined,
});
```

---

## Auth Header Resolution

When `HttpClient` makes an authenticated request, it selects the auth header using this priority:

```
if apiKey is present  →  X-Api-Key: <apiKey>
else if accessToken   →  Authorization: Bearer <accessToken>
else                  →  no auth header
```

This means if you accidentally set both `apiKey` and `accessToken`, the `apiKey` wins silently. To switch from key auth to JWT auth mid-session, call `setAccessToken()` which removes the key from config:

```ts
const veya = new Veya({ apiKey: "vya_live_..." });

// Later — wallet sign-in replaces key with JWT
await veya.authWithWallet({ wallet, signMessage });
// http.setAccessToken() is called internally — apiKey is deleted from config
// All subsequent requests use Authorization: Bearer
```

To revert back to API key auth, you must create a new `Veya` instance. There is no `setApiKey()` method.

---

## Timeout Configuration

Every request is wrapped in an `AbortController` that fires after `timeoutMs`. When the abort triggers, the SDK throws:

```
VeyaError: Request timed out  (status: 408)
```

### Choosing a Timeout

| Context | Recommended `timeoutMs` |
|---|---|
| Interactive UI (user-facing) | `8000` – `15000` ms |
| Backend API handler | `15000` – `30000` ms |
| Agent daemon / background job | `30000` – `60000` ms |
| Solana PDA operations (network-dependent) | `45000` – `90000` ms |
| CI pipeline / integration test | `10000` ms |

Solana-related routes (`/v1/solana/...`, `/v1/proofs/anchor`) involve on-chain transactions and can take longer than typical REST calls under network congestion. Use a generous timeout for these routes.

```ts
// Long-timeout client for Solana operations
const solanaVeya = new Veya({
  apiUrl: process.env.VEYA_API_URL,
  apiKey: process.env.VEYA_API_KEY,
  timeoutMs: 60_000, // 60 seconds
});

await solanaVeya.proofs.anchorContent({ label: "Audit log", content: "..." });
```

### Per-Operation Timeout Workaround

The SDK does not support per-call timeout overrides. If you need different timeouts for different operations, use separate `Veya` instances:

```ts
const fastVeya = new Veya({ ...sharedConfig, timeoutMs: 5_000 });
const slowVeya = new Veya({ ...sharedConfig, timeoutMs: 60_000 });

// Quick health check
await fastVeya.health();

// Long-running Solana anchor
await slowVeya.proofs.anchorContent({ label: "...", content: "..." });
```

---

## Environment Variable Reference

| Variable | Config Field | Required | Description |
|---|---|---|---|
| `VEYA_API_URL` | `apiUrl` | No | Base URL of the VEYA API. Falls back to `https://api.veyanet.tech`. |
| `VEYA_API_KEY` | `apiKey` | No | Server-side API key. Required for authenticated requests without wallet JWT. |

### Setting Variables

**Unix / macOS / Linux (shell)**
```bash
export VEYA_API_URL="https://api.veyanet.tech"
export VEYA_API_KEY="vya_live_..."
```

**Windows (PowerShell)**
```powershell
$env:VEYA_API_URL = "https://api.veyanet.tech"
$env:VEYA_API_KEY = "vya_live_..."
```

**Docker (environment block)**
```yaml
environment:
  VEYA_API_URL: https://api.veyanet.tech
  VEYA_API_KEY: vya_live_...
```

**`.env` file (via dotenv)**
```bash
VEYA_API_URL=https://api.veyanet.tech
VEYA_API_KEY=vya_live_...
```

```ts
import "dotenv/config"; // or require("dotenv").config()
import { Veya } from "@veya/sdk";

const veya = new Veya(); // reads from process.env after dotenv loads
```

> [!CAUTION]
> Never commit `.env` files containing live API keys to source control. Add `.env` to `.gitignore` and use a secrets manager for production credentials.

---

## Multi-Environment Setup

For applications targeting multiple VEYA environments (staging and production), maintain separate configs:

```ts
const configs = {
  staging: {
    apiUrl: "https://staging.api.veyanet.tech",
    apiKey: process.env.VEYA_API_KEY_STAGING,
    timeoutMs: 30_000,
  },
  production: {
    apiUrl: "https://api.veyanet.tech",
    apiKey: process.env.VEYA_API_KEY_PROD,
    timeoutMs: 30_000,
  },
};

const env = process.env.NODE_ENV === "production" ? "production" : "staging";
const veya = new Veya(configs[env]);
```

---

## Accessing the Resolved Config

After construction, the resolved config is available as `veya.config`:

```ts
const veya = new Veya({ timeoutMs: 20_000 });

console.log(veya.config.apiUrl);    // "https://api.veyanet.tech"
console.log(veya.config.timeoutMs); // 20000
console.log(veya.config.apiKey);    // undefined (not set)
```

> [!NOTE]
> `veya.config` is typed as `VeyaConfig` and is readonly. Do not mutate it directly — use `setAccessToken()` for auth updates and create a new instance for all other config changes.

---

## Public Routes — Unaffected by Config

Certain routes skip the auth header entirely regardless of how the client is configured. These are always safe to call on an unauthenticated instance:

| Route | Method | SDK |
|---|---|---|
| `/health` | `GET` | `veya.health()` |
| `/auth/nonce` | `GET` | internal — called by `authWithWallet()` |
| `/auth/verify` | `POST` | internal — called by `authWithWallet()` |
| `/api/verify/:signature` | `GET` | `veya.proofs.verifyTransaction()` |

The `HttpClient` uses the `auth: false` option flag to suppress auth headers on these routes:

```ts
// Internal implementation — auth: false skips all header injection
return this.http.request<HealthResponse>("/health", { auth: false });
```

---

## TypeScript: Exporting and Importing Config

The `VeyaConfig` type and `resolveConfig` function are both exported from the package root:

```ts
import { resolveConfig, type VeyaConfig } from "@veya/sdk";

// Build a config object separately before constructing the client
const config: VeyaConfig = resolveConfig({
  apiKey: process.env.VEYA_API_KEY,
  timeoutMs: 20_000,
});

// Inspect or log config before use (never log apiKey in production)
console.log("Connecting to:", config.apiUrl);
console.log("Timeout:", config.timeoutMs, "ms");

const veya = new Veya(config);
```

`resolveConfig()` can also be used to validate and normalize a config object in test setup or factory functions without immediately constructing a `Veya` client.

---

## Related

- [authentication.md](./authentication.md) — API key and wallet JWT auth flows
- [api-keys.md](./api-keys.md) — Creating and managing API keys
- [error-handling.md](./error-handling.md) — Timeout errors and `VeyaError` reference
