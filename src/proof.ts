/**
 * One proof entry: text, JSON, or a transaction hash in, a proof object out.
 * A digest without a payer is not a chain receipt. An anchor writes one
 * storeCommitment and then reads that transaction back.
 */

import { VeyaSdkError } from "./errors/veya-error.js";
import { hashBlake3 } from "./pq/blake3.js";
import { uuidStringToBytes } from "./encoding/uuid.js";
import type { VeyaClient } from "./client/VeyaClient.js";

export const TX_HASH_RE = /^0x[0-9a-fA-F]{64}$/;

export type ProveSource =
  | { kind: "text"; text: string }
  | { kind: "json"; value: unknown }
  | { kind: "tx"; txHash: string };

export type ProveOptions = {
  anchor?: boolean;
  environmentId?: string;
};

export type ProofResult = {
  ok: boolean;
  mode: "digest" | "verified" | "anchored" | "refused";
  inputKind: "text" | "json" | "tx";
  digestHex: string | null;
  anchored: boolean;
  chainId: number;
  contractAddress: string;
  txHash: string | null;
  explorerUrl: string | null;
  event: string | null;
  blockNumber: number | null;
  refusal: string | null;
};

export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortJson(value));
}

function sortJson(value: unknown): unknown {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new VeyaSdkError("INVALID_HEX", "JSON numbers must be finite");
    }
    return value;
  }
  if (Array.isArray(value)) return value.map(sortJson);
  if (typeof value === "object") {
    const source = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      if (source[key] === undefined) continue;
      sorted[key] = sortJson(source[key]);
    }
    return sorted;
  }
  throw new VeyaSdkError("INVALID_HEX", "JSON value cannot be hashed", { type: typeof value });
}

function base(client: VeyaClient, inputKind: ProofResult["inputKind"]): ProofResult {
  return {
    ok: false,
    mode: "refused",
    inputKind,
    digestHex: null,
    anchored: false,
    chainId: client.config.chainId,
    contractAddress: client.config.contractAddress,
    txHash: null,
    explorerUrl: null,
    event: null,
    blockNumber: null,
    refusal: null,
  };
}

async function digestOf(source: ProveSource): Promise<string> {
  if (source.kind === "text") {
    if (!source.text.trim()) {
      throw new VeyaSdkError("INVALID_HEX", "text input is empty");
    }
    return hashBlake3(source.text);
  }
  if (source.kind === "json") {
    return hashBlake3(canonicalJson(source.value));
  }
  throw new VeyaSdkError("INVALID_HEX", "a transaction hash is verified, not re-hashed");
}

export async function proveInput(
  client: VeyaClient,
  source: ProveSource,
  options: ProveOptions = {},
): Promise<ProofResult> {
  const ping = await client.pingChain();
  const result = base(client, source.kind);
  result.chainId = Number(ping.chainId);

  if (source.kind === "tx") {
    if (!TX_HASH_RE.test(source.txHash)) {
      result.refusal = "A receipt hash is 0x followed by 64 hex characters.";
      return result;
    }
    const proof = await client.verifyTransaction(source.txHash);
    if (!proof) {
      result.refusal = "No VEYA log was found on that transaction.";
      result.txHash = source.txHash;
      result.explorerUrl = client.explorerFor(source.txHash);
      return result;
    }
    return {
      ...result,
      ok: true,
      mode: "verified",
      digestHex: proof.digestHex,
      anchored: proof.event === "CommitmentStored",
      txHash: proof.txHash,
      explorerUrl: proof.explorerUrl,
      event: proof.event,
      blockNumber: proof.blockNumber,
      refusal: null,
    };
  }

  const digestHex = await digestOf(source);
  result.digestHex = digestHex;

  if (!options.anchor) {
    return {
      ...result,
      ok: true,
      mode: "digest",
      anchored: false,
      refusal: null,
    };
  }

  if (!client.evm) {
    result.refusal = "Anchor needs a funded payer key. No transaction was sent.";
    return result;
  }
  if (!options.environmentId) {
    result.refusal = "Anchor needs an environment id that already exists on the contract.";
    return result;
  }

  const environmentUuid = uuidStringToBytes(options.environmentId);
  const commitment = Uint8Array.from(Buffer.from(digestHex, "hex"));
  const txHash = await client.evm.storeCommitment(environmentUuid, commitment);
  const proof = await client.verifyTransaction(txHash);
  const onChain = await client.commitmentExists(digestHex);
  if (!proof || !onChain) {
    result.txHash = txHash;
    result.explorerUrl = client.explorerFor(txHash);
    result.refusal = "The transaction was sent, but the commitment was not readable afterward.";
    return result;
  }
  return {
    ...result,
    ok: true,
    mode: "anchored",
    anchored: true,
    txHash: proof.txHash,
    explorerUrl: proof.explorerUrl,
    event: proof.event,
    blockNumber: proof.blockNumber,
    refusal: null,
  };
}
