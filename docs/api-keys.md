# API Keys — Developer Authentication & Key Lifecycle

API keys are long-lived, server-side credentials that authenticate your application against the VEYA API without requiring a wallet signature on every request. They are the recommended auth mechanism for backend services, CI pipelines, and agent daemons — anywhere a human wallet interaction isn't practical.

Every key is prefixed to signal its environment tier (`vya_dev_…` or `vya_live_…`) and is transmitted automatically as the `X-Api-Key` request header by the SDK. Keys are optionally scopeable to a single environment, limiting the blast radius of any accidental exposure to that workspace alone.

> [!IMPORTANT]
> API key values are shown **exactly once** — at the moment of creation. The VEYA API does not store the raw key and cannot return it again. Save the value to a secrets manager before moving on.

---

## At a Glance

| Property | Detail |
|---|---|
| **Dev key prefix** | `vya_dev_…` — local development, CI, staging |
| **Live key prefix** | `vya_live_…` — production infrastructure only |
| **Auth header** | `X-Api-Key: <key>` |
| **Key visibility** | Shown once at creation — cannot be retrieved later |
| **Revocation** | Permanent and immediate — no grace period |
| **Scoping** | Optional `environmentId` — restricts key to one environment |
| **Auth priority** | `apiKey` takes precedence over `accessToken` in the SDK |

Keys inherit access to all environments owned by the issuing account. Scope a key to a specific `environmentId` to prevent it from accessing other workspaces if it is ever compromised.

---

## Key Tiers

### `dev` — Development Keys

Development keys are prefixed `vya_dev_`. Use these for local development, CI pipelines, and test environments.

```bash
export VEYA_API_KEY="vya_dev_38a209c1-bfed-492a-a5f1-example"
```

### `live` — Production Keys

Live keys are prefixed `vya_live_`. They have access to production environments and must only be deployed in secure server-side infrastructure. Never embed live keys in client-side code or public repositories.

```bash
export VEYA_API_KEY="vya_live_9c2f81d4-e342-40b1-production"
```

> [!CAUTION]
> Live keys carry full production access. Always scope them to a specific environment when possible, and store them in a secrets manager — never in `.env` files committed to source control.

---

## Methods

### `apiKeys.list()`

Returns metadata for all active API keys associated with the authenticated account. The full key value is **never** returned after creation.

**Signature:**
```ts
list(): Promise<ApiKeyRow[]>
```

**Example:**
```ts
import { Veya } from "@veya/sdk";

const veya = new Veya({
  apiUrl: process.env.VEYA_API_URL,
  apiKey: process.env.VEYA_API_KEY,
});

const keys = await veya.apiKeys.list();

console.log(`Found ${keys.length} active key(s):`);

for (const key of keys) {
  console.log(`  [${key.tier.toUpperCase()}] ${key.name}`);
  console.log(`    Prefix    : ${key.prefix}`);
  console.log(`    ID        : ${key.id}`);
  console.log(`    Env scope : ${key.environmentId ?? "global"}`);
  console.log(`    Created   : ${new Date(key.createdAt).toLocaleString()}`);
}
```

**Response shape** (`ApiKeyRow[]`):

| Field | Type | Description |
|---|---|---|
| `id` | `string` | UUID v4 — use this to revoke the key |
| `name` | `string` | Human-readable label set at creation |
| `tier` | `"dev" \| "live"` | Key environment tier |
| `prefix` | `string` | First characters of the key for identification |
| `environmentId` | `string \| null` | Scoped environment UUID, or `null` for global keys |
| `createdAt` | `string` | ISO 8601 creation timestamp |

**HTTP equivalent:**
```bash
curl "$VEYA_API_URL/v1/api-keys" \
  -H "X-Api-Key: $VEYA_API_KEY"
```

**Example response:**
```json
{
  "apiKeys": [
    {
      "id": "key_01HXYZ",
      "name": "ci-pipeline",
      "tier": "dev",
      "prefix": "vya_dev_38a",
      "environmentId": null,
      "createdAt": "2025-01-15T10:00:00.000Z"
    }
  ]
}
```

---

### `apiKeys.create(input)`

Creates a new API key and returns its full value. The full `key` string is returned **only in this response** and cannot be retrieved again.

**Signature:**
```ts
create(input: CreateApiKeyInput): Promise<CreateApiKeyResult>
```

**Input type:**
```ts
type CreateApiKeyInput = {
  name: string;
  tier: "dev" | "live";
  environmentId?: string;
};
```

**Result type:**
```ts
type CreateApiKeyResult = {
  apiKey: { id: string; key: string; prefix: string; tier: string };
  warning: string;
};
```

**Basic example:**
```ts
const { apiKey, warning } = await veya.apiKeys.create({
  name: "ci-pipeline",
  tier: "dev",
});

// ⚠ Save this immediately — it cannot be retrieved again
console.log(apiKey.key);     // vya_dev_38a209c1-bfed-492a-a5f1-3329dcfbe308
console.log(apiKey.prefix);  // vya_dev_38a
console.log(apiKey.id);      // use this to revoke later
console.log(apiKey.tier);    // dev
console.log(warning);        // "Store this key securely. It will not be shown again."
```

**Scoped key — restrict to one environment:**
```ts
const { apiKey } = await veya.apiKeys.create({
  name: "prod-treasury-agent",
  tier: "live",
  environmentId: env.id,
});

// This key can only make requests against `env.id`
// All other environments will return 403 Forbidden
```

**Input fields:**

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | Yes | Descriptive label — used to identify the key in `list()` |
| `tier` | `"dev" \| "live"` | Yes | Key tier — determines prefix and access context |
| `environmentId` | `string` | No | Scope key to a single environment. Omit for global access |

**HTTP equivalent:**
```bash
# Create a dev key
curl -X POST "$VEYA_API_URL/v1/api-keys" \
  -H "X-Api-Key: $VEYA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"ci-pipeline","tier":"dev"}'

# Create a scoped live key
curl -X POST "$VEYA_API_URL/v1/api-keys" \
  -H "X-Api-Key: $VEYA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"prod-treasury","tier":"live","environmentId":"env_01HXYZ"}'
```

**Example response:**
```json
{
  "apiKey": {
    "id": "key_01HXYZ",
    "key": "vya_dev_38a209c1-bfed-492a-a5f1-3329dcfbe308",
    "prefix": "vya_dev_38a",
    "tier": "dev"
  },
  "warning": "Store this key securely. It will not be shown again."
}
```

---

### `apiKeys.revoke(id)`

Permanently and immediately revokes an API key. Any request that uses the revoked key will receive `401 Unauthorized`.

**Signature:**
```ts
revoke(id: string): Promise<{ ok: boolean }>
```

**Example:**
```ts
const { ok } = await veya.apiKeys.revoke(apiKey.id);

if (ok) {
  console.log("Key revoked. All future requests using this key will be rejected.");
}
```

**Rotation pattern — always create before revoking:**
```ts
// 1. Create a replacement key first
const { apiKey: newKey } = await veya.apiKeys.create({
  name: "ci-pipeline-v2",
  tier: "dev",
});

// 2. Update your deployment secrets with the new key value
await updateSecretsManager("VEYA_API_KEY", newKey.key);

// 3. Revoke the old key only after confirming the new one works
const { ok } = await veya.apiKeys.revoke(oldKeyId);
console.log("Old key revoked:", ok);
```

> [!CAUTION]
> Revocation is **irreversible**. There is no undo or grace period. Always create a replacement key and confirm it is working before revoking the old one.

**HTTP equivalent:**
```bash
curl -X DELETE "$VEYA_API_URL/v1/api-keys/<KEY_ID>" \
  -H "X-Api-Key: $VEYA_API_KEY"
```

**Response:**
```json
{ "ok": true }
```

---

## Using a Key in the SDK

### At Construction

```ts
const veya = new Veya({
  apiUrl: "https://api.veyanet.tech",
  apiKey: "vya_live_...",
});
```

### Via Environment Variables

```bash
export VEYA_API_URL="https://api.veyanet.tech"
export VEYA_API_KEY="vya_live_..."
```

```ts
const veya = new Veya(); // resolves from process.env automatically
```

### Auth Priority

If both `apiKey` and `accessToken` are configured, `apiKey` takes precedence. Calling `setAccessToken()` clears the stored key and switches to JWT auth:

```ts
veya.setAccessToken(jwtFromWalletAuth);
// X-Api-Key is no longer sent — Authorization: Bearer is used instead
```

---

## Error Scenarios

| Status | Cause | Resolution |
|---|---|---|
| `401` | Missing or invalid `X-Api-Key` | Verify the key value and ensure the header is being sent |
| `403` | Scoped key accessing a different environment | Use the matching environment ID or a global key |
| `404` | Key ID not found during revoke | The key may already have been revoked |
| `429` | Rate limit exceeded | Back off and retry with exponential delay |

**Handling errors:**
```ts
import { isVeyaError } from "@veya/sdk";

try {
  await veya.apiKeys.revoke("nonexistent-id");
} catch (err) {
  if (isVeyaError(err)) {
    if (err.status === 404) {
      console.warn("Key not found — may already be revoked.");
    } else if (err.status === 403) {
      console.error("Insufficient permissions to revoke this key.");
    }
  }
}
```

---

## Security Best Practices

### Storage

- Store all key values in a secrets manager: AWS Secrets Manager, GCP Secret Manager, HashiCorp Vault, Doppler, or 1Password Secrets Automation.
- Never commit key values to source control, even in `.env` files.
- Do not log key values. The SDK never logs auth headers.

### Rotation

- Rotate `live` tier keys every 90 days minimum, or immediately after any suspected exposure.
- Automate rotation using your CI/CD pipeline and secrets manager's native rotation support.
- Always follow the create-then-revoke pattern to avoid downtime.

### Scoping

- Assign `environmentId` to all production keys to limit the blast radius of any compromise.
- Use separate keys per service or workload — never share a single key across multiple deployment targets.
- Maintain a naming convention in `name` that encodes the owning service and environment: `"api-gateway-prod"`, `"ci-staging"`.

### Auditing

- Run `veya.apiKeys.list()` periodically to audit active keys.
- Revoke any keys associated with offboarded team members or decommissioned services immediately.
- Cross-reference `createdAt` timestamps with your deployment logs to identify any unexpected key creation events.

---

## Complete Workflow Example

The following script demonstrates a full API key rotation flow using only the SDK:

```ts
import { Veya, isVeyaError } from "@veya/sdk";

const veya = new Veya({
  apiUrl: process.env.VEYA_API_URL,
  apiKey: process.env.VEYA_API_KEY, // existing key
});

async function rotateKey(existingKeyId: string, keyName: string) {
  // Step 1: List current keys to verify the old key exists
  const keys = await veya.apiKeys.list();
  const oldKey = keys.find((k) => k.id === existingKeyId);

  if (!oldKey) {
    throw new Error(`Key ${existingKeyId} not found — may already be revoked.`);
  }

  console.log(`Rotating key: ${oldKey.name} (${oldKey.prefix})`);

  // Step 2: Create a new key with the same name + rotation suffix
  const { apiKey: newKey } = await veya.apiKeys.create({
    name: `${keyName}-rotated`,
    tier: oldKey.tier as "dev" | "live",
    environmentId: oldKey.environmentId ?? undefined,
  });

  console.log(`New key created: ${newKey.prefix}`);
  console.log(`New key value  : ${newKey.key}`); // Store this now

  // Step 3: Revoke old key after confirming new one is stored
  const { ok } = await veya.apiKeys.revoke(existingKeyId);
  console.log(`Old key revoked: ${ok}`);

  return newKey;
}

rotateKey("key_01HXYZ", "ci-pipeline").catch(console.error);
```

---

## Related

- [authentication.md](./authentication.md) — wallet JWT vs API key auth
- [configuration.md](./configuration.md) — `VeyaConfig`, env var resolution, auth priority rules
- [error-handling.md](./error-handling.md) — `401`, `403`, and `429` error patterns
- [api-map.md](./api-map.md) — raw HTTP routes for API key endpoints
