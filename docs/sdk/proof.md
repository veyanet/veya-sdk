# Proof

Text, JSON, or a receipt hash goes in. VEYA returns one proof object. A digest without a payer is not a chain receipt. An anchor writes one `storeCommitment` and then reads that transaction back.

Run it:

```bash
npx tsx examples/prove.ts --text "hello"
npx tsx examples/prove.ts --json examples/proof-sample.json
npx tsx examples/prove.ts --tx 0xd68ab19671f0a3be63651cb6d6e24f5decf591da981708502827bca3689d31d8
npx tsx examples/prove.ts --text "hello" --anchor --environment <environment-id>
```

Without `--anchor`, the command prints the digest, `anchored` is false, and the exit code is 0. No transaction is sent. `--anchor` reads the payer from `VEYA_PAYER_PRIVATE_KEY`, `VEYA_DEPLOYER_PRIVATE_KEY`, or `VEYA_RELAYER_PRIVATE_KEY`, and the environment id from `--environment` or `VEYA_ENVIRONMENT_ID`. The key is never printed. The environment must already exist on `Veya.sol`. A missing payer or a missing environment id is a refusal: the command prints the proof JSON, exits non-zero, and sends nothing.

## Fields

| Field | Meaning |
|-------|---------|
| `ok` | `true` when the proof is a digest, a verified receipt, or a completed anchor |
| `mode` | `digest`, `verified`, `anchored`, or `refused` |
| `inputKind` | `text`, `json`, or `tx` |
| `digestHex` | BLAKE3 of the canonical input, or the digest parsed from the receipt |
| `anchored` | `true` only when the receipt event is `CommitmentStored` |
| `chainId` | Robinhood Chain testnet `46630` |
| `contractAddress` | `Veya.sol` |
| `txHash` | The receipt, when one was read or written |
| `explorerUrl` | Explorer link for that receipt |
| `event` | Parsed `Veya.sol` log name |
| `blockNumber` | Block of that receipt |
| `refusal` | Why the call stopped. `null` on success |

JSON objects are sorted by key, recursively, so the same object always hashes the same. Array order is kept.

## Text, digest only

Input: `hello`

```json
{
  "ok": true,
  "mode": "digest",
  "inputKind": "text",
  "digestHex": "ea8f163db38682925e4491c5e58d4bb3506ef8c14eb78a86e908c5624a67200f",
  "anchored": false,
  "chainId": 46630,
  "contractAddress": "0x1a1Dc3c55550FCE9F70ef6cDEeF967c0b72a5d84",
  "txHash": null,
  "explorerUrl": null,
  "event": null,
  "blockNumber": null,
  "refusal": null
}
```

`anchored: false` here is a stop. No transaction was sent.

## JSON, digest only

Input file `examples/proof-sample.json`:

```json
{
  "b": 1,
  "a": {
    "d": true,
    "c": "x"
  }
}
```

Canonical bytes: `{"a":{"c":"x","d":true},"b":1}`

```json
{
  "ok": true,
  "mode": "digest",
  "inputKind": "json",
  "digestHex": "eb4806af32a2cb606cefbd18e9282fd67c877c221f9467457d685b37d218c383",
  "anchored": false,
  "chainId": 46630,
  "contractAddress": "0x1a1Dc3c55550FCE9F70ef6cDEeF967c0b72a5d84",
  "txHash": null,
  "explorerUrl": null,
  "event": null,
  "blockNumber": null,
  "refusal": null
}
```

## Verify a receipt already on testnet

Input: `0xd68ab19671f0a3be63651cb6d6e24f5decf591da981708502827bca3689d31d8`

```json
{
  "ok": true,
  "mode": "verified",
  "inputKind": "tx",
  "digestHex": "00961cfda4cf1594532dcd00b935c729b652743fe969761e922f2e2220a195b2",
  "anchored": true,
  "chainId": 46630,
  "contractAddress": "0x1a1Dc3c55550FCE9F70ef6cDEeF967c0b72a5d84",
  "txHash": "0xd68ab19671f0a3be63651cb6d6e24f5decf591da981708502827bca3689d31d8",
  "explorerUrl": "https://explorer.testnet.chain.robinhood.com/tx/0xd68ab19671f0a3be63651cb6d6e24f5decf591da981708502827bca3689d31d8",
  "event": "CommitmentStored",
  "blockNumber": 110089670,
  "refusal": null
}
```

## Anchor one commitment, then read it back

Input text: `veya-proof-2026-09-30T09:07:01.636Z-f169bbac`

The write returned:

```json
{
  "ok": true,
  "mode": "anchored",
  "inputKind": "text",
  "digestHex": "0ef0a9f7958cb5af050ce74255f88316c188572668b72faa66ddbd8df299540a",
  "anchored": true,
  "chainId": 46630,
  "contractAddress": "0x1a1Dc3c55550FCE9F70ef6cDEeF967c0b72a5d84",
  "txHash": "0xbd5ef90696f7b5d37830d28ab7334e7f4311b0db7e4b3c3636feeec6c33ced3e",
  "explorerUrl": "https://explorer.testnet.chain.robinhood.com/tx/0xbd5ef90696f7b5d37830d28ab7334e7f4311b0db7e4b3c3636feeec6c33ced3e",
  "event": "CommitmentStored",
  "blockNumber": 126624181,
  "refusal": null
}
```

Reading that hash back returned the same digest, the same event, and the same explorer link, with `mode` `verified`.

## Refusals

A hash with no VEYA log exits non-zero:

```json
{
  "ok": false,
  "mode": "refused",
  "inputKind": "tx",
  "digestHex": null,
  "anchored": false,
  "chainId": 46630,
  "contractAddress": "0x1a1Dc3c55550FCE9F70ef6cDEeF967c0b72a5d84",
  "txHash": "0x1111111111111111111111111111111111111111111111111111111111111111",
  "explorerUrl": "https://explorer.testnet.chain.robinhood.com/tx/0x1111111111111111111111111111111111111111111111111111111111111111",
  "event": null,
  "blockNumber": null,
  "refusal": "No VEYA log was found on that transaction."
}
```

`--anchor` with no payer key exits non-zero and does not send a transaction:

```json
{
  "ok": false,
  "mode": "refused",
  "inputKind": "text",
  "digestHex": "4e40fbbc305e9ccb966dc5d8555bdfe6232b6337d425c806903d8a41efc6be7d",
  "anchored": false,
  "chainId": 46630,
  "contractAddress": "0x1a1Dc3c55550FCE9F70ef6cDEeF967c0b72a5d84",
  "txHash": null,
  "explorerUrl": null,
  "event": null,
  "blockNumber": null,
  "refusal": "Anchor needs a funded payer key. No transaction was sent."
}
```

`--anchor` with a payer key and no environment id also exits non-zero and does not send a transaction. Input text `env-missing`:

```json
{
  "ok": false,
  "mode": "refused",
  "inputKind": "text",
  "digestHex": "8906d6c1f84b35ec7a4d1d8700d9c3f69dd27e2e6507c425888f8ab364d38244",
  "anchored": false,
  "chainId": 46630,
  "contractAddress": "0x1a1Dc3c55550FCE9F70ef6cDEeF967c0b72a5d84",
  "txHash": null,
  "explorerUrl": null,
  "event": null,
  "blockNumber": null,
  "refusal": "Anchor needs an environment id that already exists on the contract."
}
```
