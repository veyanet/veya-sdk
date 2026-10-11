# Networks

`@veyanet/sdk` settles on Robinhood Chain through `Veya.sol`. `Veya.sol` is a protocol contract. It is not a token.

The default profile is **Mainnet**. **Testnet** is selected only when the caller asks for it.

| How you select it | Profile |
|-------------------|---------|
| Omit `network`, or set `network: "mainnet"` | Mainnet |
| Leave `ROBINHOOD_NETWORK` unset, or set it to anything other than `testnet` | Mainnet |
| `network: "testnet"` or `ROBINHOOD_NETWORK=testnet` | Testnet (optional) |

An explicit empty Mainnet contract (`contractAddress: ""` or `VEYA_MAINNET_CONTRACT_ADDRESS=`) returns `MAINNET_UNPUBLISHED` and sends nothing. Guest Use on Mainnet stays closed. The Mainnet payer slot is `VEYA_MAINNET_RELAYER_PRIVATE_KEY` only. Testnet reads `VEYA_DEPLOYER_PRIVATE_KEY`.

`https://api.veyanet.tech` and `https://mcp.veyanet.tech` run the Mainnet profile.

The tables below are the wallet and RPC pins. Numeric chain ids live in `src/chain.ts`.

## Mainnet

| Parameter | Value |
|-----------|-------|
| **Profile** | Mainnet |
| **RPC** | `https://rpc.mainnet.chain.robinhood.com` |
| **Explorer** | `https://robinhoodchain.blockscout.com` |
| **Protocol contract** | [`0x87dC582eEA544A434a5C1e30Ca3d12c1e548a674`](https://robinhoodchain.blockscout.com/address/0x87dC582eEA544A434a5C1e30Ca3d12c1e548a674) |
| **Deploy transaction** | `0x20207430b768f2215e68a0f37739070599362047493acf1b90a2eba2b7653559` |
| **Payer address** | `0x5612E209761e0948EfD0aF7d516dB047180cbC5D` |
| **Code** | `ROBINHOOD_MAINNET` in `src/chain.ts` |

## Testnet

| Parameter | Value |
|-----------|-------|
| **Profile** | Testnet (optional) |
| **RPC** | `https://rpc.testnet.chain.robinhood.com` |
| **Explorer** | `https://explorer.testnet.chain.robinhood.com` |
| **Faucet** | `https://faucet.testnet.chain.robinhood.com/` |
| **Protocol contract** | [`0x1a1Dc3c55550FCE9F70ef6cDEeF967c0b72a5d84`](https://explorer.testnet.chain.robinhood.com/address/0x1a1Dc3c55550FCE9F70ef6cDEeF967c0b72a5d84) |
| **Code** | `ROBINHOOD_TESTNET` in `src/chain.ts` |

## Code

```ts
import { VeyaClient, ROBINHOOD_MAINNET, ROBINHOOD_TESTNET } from "@veyanet/sdk";

const mainnet = new VeyaClient();
const testnet = new VeyaClient({ network: "testnet" });
```

`ROBINHOOD_MAINNET.contractAddress` is the Mainnet protocol contract. `ROBINHOOD_TESTNET.contractAddress` is the Testnet protocol contract.
