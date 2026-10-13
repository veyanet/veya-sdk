# Sealed decision

An evidence id and a decision object go in. VEYA runs that payload in the sealed runtime, collects a 2-of-3 ML-DSA quorum, and can write one `attestExecution` receipt.

Run it:

```bash
# Mainnet (default): pass an environment registered on Mainnet
npx tsx examples/seal-decision.ts --environment <environment-id> --evidence item-1 --decision "{\"outcome\":\"allow\"}"
# Testnet: uses the shared seal environment
npx tsx examples/seal-decision.ts --network testnet --evidence item-1 --decision "{\"outcome\":\"allow\"}"
```

On Testnet the call uses environment `7d0af0ba-2ae3-4d0e-bc75-0bbaccb3dd71` and agent `55c7a27d-64a3-4205-89ab-9fa0ab13a9af`. Both are already registered there. On Mainnet that shared environment does not exist, so pass `--environment` (or set `VEYA_SEAL_DECISION_ENVIRONMENT_ID`). Without it the command prints `code` `ENVIRONMENT_MISSING` and sends nothing. The command does not send a registration transaction.

If the sealed node does not answer, the JSON is `code` `SEALED_UNREACHABLE`, `transaction` null, and `continuedOnOpenWorker` false. No transaction is sent.

If the sealed node answers, the JSON carries the sealed fingerprint, `runtime` `AES-256-GCM`, and the quorum. `chain` is null unless a payer is available. `VEYA_PAYER_PRIVATE_KEY` pays for the receipt. `VEYA_SEAL_DECISION_RELAYER=1` lets `VEYA_RELAYER_PRIVATE_KEY` pay when no payer key is set. The key is never printed. With the switch off and no payer key, the sealed result and the quorum are returned and nothing is sent.

## Fields on success

| Field | Meaning |
|-------|---------|
| `ok` | `true` |
| `evidenceId` | The shared name of the item |
| `sealed.fingerprint` | BLAKE3 from the sealed runtime |
| `sealed.runtime` | `AES-256-GCM` |
| `sealed.transaction` | `null`. The sealed step does not write the receipt |
| `attestation.agreedBlake3Hash` | The quorum hash |
| `attestation.signatures` | At least two ML-DSA signatures on that hash |
| `chain` | The `attestExecution` receipt, or `null` when nothing was sent |

`chain.mode` is `attestExecution`. `chain.contractAddress` is `Veya.sol` on the selected profile. The default is **Mainnet**. Pass `--network testnet` for **Testnet**. Nothing is sent when the sealed node is down.
