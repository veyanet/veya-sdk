/**
 * One sealed decision: an evidence id and a decision object in.
 * The sealed runtime runs first. If it does not answer, nothing is written.
 * A 2-of-3 ML-DSA quorum follows. attestExecution is sent only when a payer
 * key is passed, or when the operator relayer switch is on and a relayer key
 * is passed into this call. The host environment is not read here.
 */

import { randomBytes } from "node:crypto";
import { EvmAnchor } from "./client/evm.js";
import { parseProofFromTransaction } from "./client/receipts.js";
import { runConsensus, type ConsensusResult } from "./compute/consensus.js";
import { resolveConfig } from "./config.js";
import { uuidStringToBytes } from "./encoding/uuid.js";
import { VeyaSdkError, isVeyaSdkError } from "./errors/veya-error.js";
import { protectedExec } from "./sealed/protectedExec.js";
import { requireVerifiedSeal, type SealedExecResult } from "./sealed/types.js";

/** Registered on Robinhood Chain Testnet. Mainnet uses the same id only after that environment exists there. */
export const SEAL_DECISION_ENVIRONMENT_ID = "7d0af0ba-2ae3-4d0e-bc75-0bbaccb3dd71";
export const SEAL_DECISION_AGENT_ID = "55c7a27d-64a3-4205-89ab-9fa0ab13a9af";

export function resolveSealDecisionIds(
  options: Pick<SealDecisionOptions, "environmentId" | "agentId">,
  network: "testnet" | "mainnet",
): { environmentId: string; agentId: string } {
  const explicitEnvironment =
    options.environmentId?.trim() ||
    process.env.VEYA_SEAL_DECISION_ENVIRONMENT_ID?.trim() ||
    (network === "mainnet" ? process.env.VEYA_SEAL_DECISION_MAINNET_ENVIRONMENT_ID?.trim() : "");
  if (network === "mainnet" && !explicitEnvironment) {
    throw new VeyaSdkError(
      "ENVIRONMENT_MISSING",
      "This seal environment is registered on testnet only. Nothing was sent.",
    );
  }
  const agentFromProcess =
    network === "mainnet"
      ? process.env.VEYA_SEAL_DECISION_MAINNET_AGENT_ID?.trim() ||
        process.env.VEYA_SEAL_DECISION_AGENT_ID?.trim()
      : process.env.VEYA_SEAL_DECISION_AGENT_ID?.trim();
  return {
    environmentId: explicitEnvironment || SEAL_DECISION_ENVIRONMENT_ID,
    agentId: options.agentId?.trim() || agentFromProcess || SEAL_DECISION_AGENT_ID,
  };
}

export type SealDecisionInput = {
  evidenceId: string;
  decision: Record<string, unknown>;
};

export type SealDecisionOptions = {
  payerPrivateKey?: string;
  /** When true, relayerPrivateKey may pay. Default is off. */
  operatorRelayer?: boolean;
  relayerPrivateKey?: string;
  sealedNodeUrl?: string;
  validatorUrls?: string[];
  environmentId?: string;
  agentId?: string;
  timeoutMs?: number;
  rpcUrl?: string;
  contractAddress?: string;
  chainId?: number;
  explorerUrl?: string;
  /** "testnet" selects chain 46630. Unset stays on the mainnet profile. */
  network?: "testnet" | "mainnet";
  /** Guest settlement is refused on mainnet and stays testnet-only. */
  guest?: boolean;
};

export type SealDecisionRefusal = {
  ok: false;
  evidenceId: string;
  code: "SEALED_UNREACHABLE";
  transaction: null;
  continuedOnOpenWorker: false;
};

export type SealDecisionSuccess = {
  ok: true;
  evidenceId: string;
  sealed: {
    fingerprint: string;
    runtime: "AES-256-GCM";
    /** Same as chain.txHash once a receipt is written; null when nothing was sent. */
    transaction: string | null;
  };
  attestation: {
    agreedBlake3Hash: string;
    consensusReached: true;
    threshold: number;
    signatures: Array<{
      nodeId: string;
      blake3Hash: string;
      mldsaSignature: string;
      mldsaPublicKey: string | null;
    }>;
  };
  chain: null | {
    network: "testnet" | "mainnet";
    chainId: number;
    contractAddress: string;
    txHash: string;
    mode: "attestExecution";
    blockNumber: number;
    explorerUrl: string;
    blake3Hash: string;
  };
};

export type SealDecisionResult = SealDecisionRefusal | SealDecisionSuccess;

export type SealDecisionRunners = {
  runSealed?: typeof protectedExec;
  runQuorum?: typeof runConsensus;
  commit?: (
    payerKey: string,
    agreedHash: string,
    signatureHex: string,
  ) => Promise<{ txHash: string; blockNumber: number; explorerUrl: string }>;
};

function hexToBytes(hex: string): Uint8Array {
  const h = hex.trim().replace(/^0x/, "");
  return Uint8Array.from(Buffer.from(h, "hex"));
}

export function resolveSealPayer(options: SealDecisionOptions): string | undefined {
  const explicit = options.payerPrivateKey?.trim();
  if (explicit) return explicit;
  if (options.operatorRelayer) {
    const relayer = options.relayerPrivateKey?.trim();
    if (relayer) return relayer;
  }
  return undefined;
}

function refusal(evidenceId: string): SealDecisionRefusal {
  return {
    ok: false,
    evidenceId,
    code: "SEALED_UNREACHABLE",
    transaction: null,
    continuedOnOpenWorker: false,
  };
}

function isSealedUnreachable(err: unknown): boolean {
  return isVeyaSdkError(err) && err.code === "SEALED_UNREACHABLE";
}

async function commitAttestation(
  payerKey: string,
  agreedHash: string,
  signatureHex: string,
  options: SealDecisionOptions,
): Promise<{ txHash: string; blockNumber: number; explorerUrl: string }> {
  const anchor = new EvmAnchor({
    payerPrivateKey: payerKey,
    network: options.network,
    rpcUrl: options.rpcUrl,
    contractAddress: options.contractAddress,
    chainId: options.chainId,
    explorerUrl: options.explorerUrl,
    sealedNodeUrl: options.sealedNodeUrl,
    validatorNodes: options.validatorUrls,
    requestTimeoutMs: options.timeoutMs,
  });
  const environmentId = resolveSealDecisionIds(options, anchor.network).environmentId;
  const txHash = await anchor.attestExecution(
    uuidStringToBytes(environmentId),
    hexToBytes(agreedHash),
    hexToBytes(signatureHex),
  );
  const proof = await parseProofFromTransaction(
    anchor.provider,
    txHash,
    anchor.contractAddress,
    anchor.explorerUrl,
  );
  if (!proof || proof.event !== "ExecutionAttested") {
    throw new VeyaSdkError(
      "ANCHOR_REVERT",
      "The transaction was sent, but the attestation was not readable afterward.",
      { txHash },
    );
  }
  if (proof.digestHex.toLowerCase() !== agreedHash.replace(/^0x/, "").toLowerCase()) {
    throw new VeyaSdkError("ANCHOR_REVERT", "Attestation digest does not match the quorum hash", {
      txHash,
    });
  }
  return {
    txHash,
    blockNumber: proof.blockNumber ?? 0,
    explorerUrl: proof.explorerUrl,
  };
}

export async function sealDecision(
  input: SealDecisionInput,
  options: SealDecisionOptions = {},
  runners: SealDecisionRunners = {},
): Promise<SealDecisionResult> {
  const evidenceId = input.evidenceId?.trim() ?? "";
  if (!evidenceId) throw new VeyaSdkError("INVALID_CONFIG", "evidenceId is required");
  if (!input.decision || typeof input.decision !== "object" || Array.isArray(input.decision)) {
    throw new VeyaSdkError("INVALID_CONFIG", "decision must be a JSON object");
  }

  const resolved = resolveConfig({
    network: options.network,
    rpcUrl: options.rpcUrl,
    contractAddress: options.contractAddress,
    chainId: options.chainId,
    explorerUrl: options.explorerUrl,
    sealedNodeUrl: options.sealedNodeUrl,
    validatorNodes: options.validatorUrls,
    requestTimeoutMs: options.timeoutMs,
  });
  const { environmentId, agentId } = resolveSealDecisionIds(options, resolved.network);
  const runSealed = runners.runSealed ?? protectedExec;
  const runQuorum = runners.runQuorum ?? runConsensus;

  let sealed: SealedExecResult;
  try {
    const raw = await runSealed(
      options.sealedNodeUrl ?? resolved.sealedNodeUrl,
      {
        environmentId,
        agentId,
        eventType: "seal.decision",
        payload: { evidenceId, decision: input.decision },
        sessionEntropy: randomBytes(32),
      },
      { timeoutMs: options.timeoutMs ?? resolved.requestTimeoutMs },
    );
    sealed = requireVerifiedSeal(raw);
  } catch (err) {
    if (isSealedUnreachable(err)) return refusal(evidenceId);
    throw err;
  }

  const consensus: ConsensusResult = await runQuorum(
    options.validatorUrls ?? resolved.validatorNodes,
    evidenceId,
    {
      evidenceId,
      decision: input.decision,
      sealedFingerprint: sealed.output_blake3_hash,
    },
    { threshold: 2, timeoutMs: options.timeoutMs ?? resolved.requestTimeoutMs },
  );

  if (!consensus.consensus_reached || !consensus.agreed_blake3_hash) {
    throw new VeyaSdkError("CONSENSUS_UNREACHABLE", "Validator quorum was not reached");
  }

  const matching = consensus.node_results.filter(
    (node) =>
      node.status === "success" &&
      node.blake3_execution_hash.toLowerCase() === consensus.agreed_blake3_hash!.toLowerCase() &&
      node.mldsa_signature.length > 0,
  );
  if (matching.length < 2) {
    throw new VeyaSdkError("CONSENSUS_UNREACHABLE", "Fewer than two ML-DSA signatures match the quorum hash");
  }

  const success: SealDecisionSuccess = {
    ok: true,
    evidenceId,
    sealed: {
      fingerprint: sealed.output_blake3_hash,
      runtime: "AES-256-GCM",
      transaction: null,
    },
    attestation: {
      agreedBlake3Hash: consensus.agreed_blake3_hash,
      consensusReached: true,
      threshold: consensus.threshold,
      signatures: matching.map((node) => ({
        nodeId: node.node_id,
        blake3Hash: node.blake3_execution_hash,
        mldsaSignature: node.mldsa_signature,
        mldsaPublicKey: node.mldsa_public_key_hex ?? null,
      })),
    },
    chain: null,
  };

  const payerKey = resolveSealPayer(options);
  if (options.guest && resolved.network === "mainnet") {
    throw new VeyaSdkError(
      "GUEST_TESTNET_ONLY",
      "Guest settlement stays on Robinhood Chain testnet. Nothing was sent.",
      { chainId: resolved.chainId },
    );
  }
  if (resolved.network === "mainnet" && !resolved.contractAddress) {
    throw new VeyaSdkError(
      "MAINNET_UNPUBLISHED",
      "Veya.sol is not published on Robinhood Chain mainnet. Nothing was sent.",
      { chainId: resolved.chainId },
    );
  }
  if (!payerKey) return success;

  const commit =
    runners.commit ??
    ((key: string, hash: string, signatureHex: string) =>
      commitAttestation(key, hash, signatureHex, options));
  const chain = await commit(payerKey, consensus.agreed_blake3_hash, matching[0].mldsa_signature);
  success.chain = {
    network: resolved.network,
    chainId: resolved.chainId,
    contractAddress: resolved.contractAddress,
    txHash: chain.txHash,
    mode: "attestExecution",
    blockNumber: chain.blockNumber,
    explorerUrl: chain.explorerUrl,
    blake3Hash: consensus.agreed_blake3_hash,
  };
  success.sealed.transaction = chain.txHash;
  return success;
}
