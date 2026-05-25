# Contributing to `@veya/sdk`

Thank you for your interest in contributing to the VEYA ecosystem! The `@veya/sdk` is the primary interface developers use to build privacy-preserving agents on Solana. We maintain strict standards for code quality, cryptographic boundaries, and type safety to ensure a secure developer experience.

This guide outlines how to set up your environment, our architectural guidelines, and the process for submitting Pull Requests.

---

## 1. Development Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher (required for native `fetch` and `webcrypto`).
- **Package Manager**: We use `npm` for dependency management.

### Initializing the Workspace
```bash
# 1. Clone the repository (or your fork)
git clone https://github.com/veyanet/veya-sdk.git
cd veya-sdk

# 2. Install dependencies
npm install

# 3. Build the project to verify setup
npm run build
```

---

## 2. Testing Your Changes

The SDK supports two testing tiers to ensure reliability and speed:

### Unit & Mock Testing
For fast, offline unit checks, we use [Vitest](https://vitest.dev/) along with fetch stubs. This allows you to verify API payload construction without requiring a live gateway or network connection.

```bash
# Run the unit tests
npm run test

# Run tests in watch mode during active development
npm run test:watch
```

### Live Integration Testing
To test real API behaviors, consensus coordination, and decentralized compute flows against the live server:
1. Set the target environment variables in your test environment:
   ```bash
   VEYA_API_URL=https://api.veyanet.tech
   VEYA_API_KEY=your_dev_api_key
   ```
2. Run the integration test suite to execute live endpoints:
   ```bash
   npm run test
   ```

### Testing Rules
*   **Isolate Public Networks**: Avoid sending tests directly to Solana mainnet or external production endpoints. Always use local devnet anchors or fetch mocks.
*   **Assert Consensus & Responses**: When adding checks for decentralized compute, assert that consensus status returns successfully and nodes are correctly cataloged.
*   **Path Coverage**: Ensure any new classes or helper functions include corresponding unit test cases in the `tests/` folder.

---

## 3. Code Style & Linting

We enforce strict linting to maintain a clean, uniform codebase.

```bash
# Check for linting errors
npm run lint

# Automatically fix linting and formatting errors (Prettier + ESLint)
npm run format
```

- We use **TypeScript strict mode**. `any` types are strictly prohibited unless interacting with opaque external libraries.
- Use explicit return types for all public-facing methods.
- Document all public methods and interfaces using TSDoc comments (these drive IDE tooltips).

---

## 4. Architectural Boundaries (CRITICAL)

The `@veya/sdk` implements a strict **Zero-Knowledge Privacy Model**. When contributing, you must ensure that your changes do not compromise this model.

### 🚫 Never Transmit Plaintext Configuration
If you are modifying agent deployment logic, ensure `encryptAgentConfig()` is correctly used. Plaintext configurations must **never** be included in `fetch` payloads.

### 🚫 Never Transmit Plaintext Memory
If you are modifying the memory module, ensure that `memory.storeContent()` hashes the text locally via `sha256Hex()` before transmission. The API should only ever receive the 64-character hex digest.

### 🚫 Do Not Add External Crypto Dependencies
We rely exclusively on the native `Web Crypto API` (`globalThis.crypto.subtle` in browsers, `node:crypto` in Node). Do not introduce third-party cryptography libraries (e.g., `crypto-js`, `forge`) as they increase bundle size and attack surface. The only exception is `bs58` for Solana base58 encoding.

---

## 5. Adding New Resources

If you are contributing support for a new VEYA API resource namespace (e.g., a new `/v1/analytics` route):

1. **Create the Types**: Define the request/response shapes in `src/types/`.
2. **Create the Module**: Implement the resource class in `src/resources/your-module.ts`. It must accept the shared `HttpClient` instance in its constructor.
3. **Register the Module**: Add your module to the main `Veya` client class in `src/index.ts`.
4. **Update Documentation**:
   - Add the new endpoints to `docs/api-map.md`.
   - Write a dedicated guide or update an existing one in the `docs/` folder.
5. **Write Tests**: Create `tests/your-module.test.ts`.

Refer to `docs/ARCHITECTURE.md` for a deep dive into the SDK extension patterns.

---

## 6. Pull Request Process

1. **Fork the repository** and create your branch from `main`.
2. If you've added code that should be tested, **add tests**.
3. If you've changed APIs, **update the documentation** in the `docs/` folder and TSDoc comments.
4. Ensure the test suite passes (`npm run test`).
5. Ensure your code lints (`npm run lint`).
6. Create a detailed Pull Request. Include:
   - What the PR solves (reference any open issue numbers).
   - How you tested it.
   - Any breaking changes to the public API.
7. Update the `CHANGELOG.md` in the `[Unreleased]` section.

### Breaking Changes
The `@veya/sdk` is heavily relied upon by production infrastructure. We avoid breaking changes whenever possible. If your PR introduces a breaking change (renaming a public method, changing an interface shape, etc.), please discuss it in an Issue first.

---

## 7. Reporting Issues

If you find a bug or have a feature request, please [open an issue](https://github.com/veyanet/veya-sdk/issues/new).

- **Bug Reports**: Include Node.js version, SDK version, a minimal reproducible example, and exactly what error was thrown.
- **Security Vulnerabilities**: Do **NOT** open a public issue. Refer to `SECURITY.md` for our responsible disclosure process.

Thank you for helping make VEYA better!
