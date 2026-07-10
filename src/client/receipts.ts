/**
 * Parse Veya.sol logs from a Robinhood Chain receipt.
 *
 * The hosted verify page and SDK callers both need the 32-byte commitment
 * without trusting the UI. Only events from the configured contract address
 * are accepted — a receipt that called a different `to` is not a VEYA proof.
 */

import { ethers } from "ethers";
import { VEYA_ABI } from "../abi/index.js";
import { explorerTxUrl } from "../chain.js";
import { VeyaSdkError } from "../errors/veya-error.js";

export type ParsedVeyaProof = {
  txHash: string;
  event: "CommitmentStored" | "ExecutionAttested" | "PqAttestationAnchored" | "EnvironmentRegistered";
  digestHex: string;
  uri: string;
  environmentUuid?: string;
  blockNumber: number | null;
  explorerUrl: string;
};

const IFACE = new ethers.Interface(VEYA_ABI);

export function parseVeyaLogs(
  logs: ReadonlyArray<{ address: string; topics: readonly string[]; data: string }>,
  contractAddress: string,
  txHash: string,
  explorerBase: string,
  blockNumber: number | null = null,
): ParsedVeyaProof[] {
  const expected = contractAddress.toLowerCase();
  const proofs: ParsedVeyaProof[] = [];

  for (const log of logs) {
    if (log.address.toLowerCase() !== expected) continue;
    let parsed: ethers.LogDescription | null;
    try {
      parsed = IFACE.parseLog({ topics: log.topics as string[], data: log.data });
    } catch {
      continue;
    }
    if (!parsed) continue;

    if (parsed.name === "CommitmentStored") {
      const digest = String(parsed.args.commitment).replace(/^0x/, "").toLowerCase();
      proofs.push({
        txHash,
        event: "CommitmentStored",
        digestHex: digest,
        uri: `veya://${digest}`,
        environmentUuid: String(parsed.args.environmentUuid),
        blockNumber,
        explorerUrl: explorerTxUrl(txHash, explorerBase),
      });
    } else if (parsed.name === "ExecutionAttested") {
      const digest = String(parsed.args.blake3Hash).replace(/^0x/, "").toLowerCase();
      proofs.push({
        txHash,
        event: "ExecutionAttested",
        digestHex: digest,
        uri: `veya://blake3/${digest}`,
        environmentUuid: String(parsed.args.environmentUuid),
        blockNumber,
        explorerUrl: explorerTxUrl(txHash, explorerBase),
      });
    } else if (parsed.name === "PqAttestationAnchored") {
      const digest = String(parsed.args.executionHash).replace(/^0x/, "").toLowerCase();
      proofs.push({
        txHash,
        event: "PqAttestationAnchored",
        digestHex: digest,
        uri: `veya://blake3/${digest}`,
        environmentUuid: String(parsed.args.environmentUuid),
        blockNumber,
        explorerUrl: explorerTxUrl(txHash, explorerBase),
      });
    } else if (parsed.name === "EnvironmentRegistered") {
      const digest = String(parsed.args.pqPubkeyHash).replace(/^0x/, "").toLowerCase();
      proofs.push({
        txHash,
        event: "EnvironmentRegistered",
        digestHex: digest,
        uri: `veya://pq/${digest}`,
        environmentUuid: String(parsed.args.uuid),
        blockNumber,
        explorerUrl: explorerTxUrl(txHash, explorerBase),
      });
    }
  }

  return proofs;
}

export async function parseProofFromTransaction(
  provider: ethers.Provider,
  txHash: string,
  contractAddress: string,
  explorerBase: string,
): Promise<ParsedVeyaProof | null> {
  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt) return null;
  if ((receipt.to ?? "").toLowerCase() !== contractAddress.toLowerCase()) {
    throw new VeyaSdkError(
      "CHAIN_MISMATCH",
      "transaction did not target Veya.sol — not a VEYA proof",
      { to: receipt.to, expected: contractAddress, txHash },
    );
  }
  const proofs = parseVeyaLogs(receipt.logs, contractAddress, txHash, explorerBase, receipt.blockNumber);
  return proofs[0] ?? null;
}
