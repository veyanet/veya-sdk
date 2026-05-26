# Security Policy

The `@veya/sdk` provides cryptographic guarantees and acts as the primary defense boundary between local client infrastructure and the VEYA API. We take the security of this repository extremely seriously.

---

## Supported Versions

Security updates are only applied to the latest stable release. Please ensure you are running the most current version of `@veya/sdk`.

| Version | Supported |
| --- | --- |
| `0.1.x` | ✅ Yes |
| `0.0.x-alpha/beta` | ❌ No |

If you are running a pre-release version, please upgrade to the latest stable release immediately.

---

## Reporting a Vulnerability

**DO NOT OPEN PUBLIC ISSUES FOR UNDISCLOSED SECURITY VULNERABILITIES.**

If you discover a security vulnerability in the `@veya/sdk`, please report it privately to our security team via email:

**[security@veyanet.tech](mailto:security@veyanet.tech)**

### What to Include
To help us resolve the issue quickly, please include the following in your report:
1. **Description**: A detailed explanation of the vulnerability.
2. **Impact**: What could an attacker achieve? (e.g., plaintext recovery of agent configs, memory hash collisions, JWT exfiltration).
3. **Reproduction Steps**: Step-by-step instructions or a proof-of-concept script.
4. **Environment**: Your Node.js version, `@veya/sdk` version, and operating system.

### Our Response Process
- We aim to acknowledge receipt of your vulnerability report within **48 hours**.
- We will provide an initial assessment and timeline for a fix within **5 business days**.
- We ask that you maintain confidentiality until we have published a patch and alerted our users.
- Once resolved, we will publish a security advisory and credit you for the discovery (if desired).

---

## What We Consider a Vulnerability

We are particularly interested in reports concerning our core security boundaries:

- **Cryptographic Failures**: Any flaw in the `crypto.ts` module that weakens the AES-256-GCM configuration encryption (e.g., predictable IV generation, key material leakage, padding Oracle attacks).
- **Zero-Knowledge Leaks**: Any code path where `veya.memory.storeContent()` or `veya.agents.deployEncrypted()` accidentally transmits plaintext payload data over the network instead of the intended hash or ciphertext.
- **Authentication Bypasses**: Any flaw in how the SDK handles, stores, or transmits the wallet JWT (`Authorization: Bearer`) or API Key (`X-Api-Key`) headers.
- **Dependency Poisoning**: Vulnerabilities introduced by our minimal third-party dependency tree (currently only `bs58`).

## What We DO NOT Consider a Vulnerability

- Issues regarding the VEYA API backend, Solana smart contracts, or the VEYA relayer infrastructure. (These are out of scope for the SDK repository — though you may still report them to `security@veyanet.tech`).
- Physical access attacks against the host machine running the SDK.
- XSS or CSRF vulnerabilities in third-party applications that happen to import the SDK.
- User error resulting from hardcoding `AGENT_PASSPHRASE` or `VEYA_API_KEY` into public source repositories.

---

## Cryptographic Disclosures

The `@veya/sdk` relies on the host environment's native Web Crypto API (`globalThis.crypto.subtle` or `node:crypto`). The security of our AES-256-GCM and SHA-256 implementations is fundamentally tied to the security of the host's V8 engine or Node.js runtime. 
