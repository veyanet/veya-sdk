# Robinhood Chain Testnet Pin & Network Configuration

This document contains the low-level network details and contract specifications for `@veyanet/sdk` on **Robinhood Chain Testnet**.

> [!NOTE]
> `Veya.sol` is the protocol contract for environment records, commitments, spending limits, tool policies, and sealed execution state. It is **not** a token contract and does not implement ERC-20.

---

## 📌 Network Constants

| Parameter | Value |
|-----------|-------|
| **Network Name** | Robinhood Chain Testnet |
| **Chain ID** | `46630` (`0xb636`) |
| **RPC Endpoint** | `https://rpc.testnet.chain.robinhood.com` |
| **Block Explorer** | `https://explorer.testnet.chain.robinhood.com` |
| **Protocol Contract** | [`0x1a1Dc3c55550FCE9F70ef6cDEeF967c0b72a5d84`](https://explorer.testnet.chain.robinhood.com/address/0x1a1Dc3c55550FCE9F70ef6cDEeF967c0b72a5d84) |
| **Native Spending Unit** | **wei** (18-decimal ETH) |
| **ABI Location** | Built into package (`src/abi/Veya.json`) |
| **Machine-Readable Pin** | [`deployments/testnet.json`](../../deployments/testnet.json) |

---

## 🔒 Post-Quantum & Cryptographic Parameters

| Security Boundary | Algorithm | Specification |
|-------------------|-----------|---------------|
| **Agent / Validator Identity** | ML-DSA-44 | FIPS 204 (1,312-byte pubkey, 2,560-byte sig) |
| **Session Transport** | Kyber-768 | FIPS 203 (1,184-byte pubkey, 1,088-byte ciphertext) |
| **Commitments & Digesting** | BLAKE3-256 | 32-byte hash / 64-char hex string |
| **Sealed Execution** | AES-256-GCM | 12-byte IV + 16-byte auth tag + BLAKE3 commitment |
| **Quorum Threshold** | 2-of-3 | Byzantine fault tolerant fleet consensus |

---

## 💻 Code Usage

```ts
import { ROBINHOOD_TESTNET, ROBINHOOD_TESTNET_CHAIN_ID, isRobinhoodTestnet } from "@veyanet/sdk";

console.log(ROBINHOOD_TESTNET.chainId); // 46630
console.log(isRobinhoodTestnet(46630)); // true
```
