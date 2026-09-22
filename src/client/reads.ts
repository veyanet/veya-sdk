/**
 * Read-only Veya.sol calls. No payer key and no transaction.
 * MCP chain tools use these so a stranger can check a commitment,
 * an environment, or an agent without opening a wallet.
 */

import { ethers } from "ethers";
import { VEYA_ABI } from "../abi/index.js";
import { VeyaSdkError } from "../errors/veya-error.js";
import { parseVeyaLogs, type ParsedVeyaProof } from "./receipts.js";

export type CommitmentRecord = {
  authority: string;
  environmentUuid: string;
  commitment: string;
  timestamp: string;
  exists: boolean;
};

export type EnvironmentRecord = {
  owner: string;
  uuid: string;
  pqPubkeyHash: string;
  envType: number;
  createdAt: string;
  revision: number;
  exists: boolean;
};

export type AgentRecord = {
  environmentUuid: string;
  agentUuid: string;
  role: number;
  pqHash: string;
  isActive: boolean;
  createdAt: string;
  exists: boolean;
};

export type CommitmentCheck = {
  digestHex: string;
  onChain: boolean;
  record: CommitmentRecord;
};

export function createReadContract(rpcUrl: string, contractAddress: string): ethers.Contract {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  return new ethers.Contract(contractAddress, VEYA_ABI, provider);
}

export function digestToBytes32(digestHex: string): string {
  return fixedHex(digestHex, 32, "commitment digest");
}

export function uuidToBytes16(uuid: Uint8Array): string {
  if (uuid.length !== 16) {
    throw new VeyaSdkError("INVALID_UUID", `Expected 16-byte UUID, got ${uuid.length} bytes`);
  }
  return ethers.hexlify(uuid).toLowerCase();
}

function fixedHex(value: string, bytes: number, label: string): string {
  const hex = value.trim().replace(/^0x/, "");
  if (!new RegExp(`^[0-9a-fA-F]{${bytes * 2}}$`).test(hex)) {
    throw new VeyaSdkError("INVALID_HEX", `Expected ${bytes}-byte ${label}`);
  }
  return `0x${hex.toLowerCase()}`;
}

function hexLower(value: unknown): string {
  return String(value).toLowerCase();
}

export async function readCommitment(
  contract: ethers.Contract,
  digestHex: string,
): Promise<CommitmentRecord> {
  const row = await contract.commitments(digestToBytes32(digestHex));
  return {
    authority: String(row.authority),
    environmentUuid: hexLower(row.environmentUuid),
    commitment: hexLower(row.commitment),
    timestamp: row.timestamp.toString(),
    exists: Boolean(row.exists),
  };
}

export async function readEnvironmentRecord(
  contract: ethers.Contract,
  environmentUuid: Uint8Array,
): Promise<EnvironmentRecord> {
  const row = await contract.environments(uuidToBytes16(environmentUuid));
  return {
    owner: String(row.owner),
    uuid: hexLower(row.uuid),
    pqPubkeyHash: hexLower(row.pqPubkeyHash),
    envType: Number(row.envType),
    createdAt: row.createdAt.toString(),
    revision: Number(row.revision),
    exists: Boolean(row.exists),
  };
}

export async function readAgentRecord(
  contract: ethers.Contract,
  agentUuid: Uint8Array,
): Promise<AgentRecord> {
  const row = await contract.agents(uuidToBytes16(agentUuid));
  return {
    environmentUuid: hexLower(row.environmentUuid),
    agentUuid: hexLower(row.agentUuid),
    role: Number(row.role),
    pqHash: hexLower(row.pqHash),
    isActive: Boolean(row.isActive),
    createdAt: row.createdAt.toString(),
    exists: Boolean(row.exists),
  };
}

export async function verifyCommitmentOnChain(
  rpcUrl: string,
  contractAddress: string,
  explorerUrl: string,
  txHash: string,
): Promise<{ proofs: ParsedVeyaProof[]; commitmentChecks: CommitmentCheck[] }> {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const receipt = await provider.getTransactionReceipt(txHash);
  if (!receipt) return { proofs: [], commitmentChecks: [] };
  if ((receipt.to ?? "").toLowerCase() !== contractAddress.toLowerCase()) {
    throw new VeyaSdkError(
      "CHAIN_MISMATCH",
      "transaction did not target Veya.sol — not a VEYA proof",
      { to: receipt.to, expected: contractAddress, txHash },
    );
  }
  const proofs = parseVeyaLogs(
    receipt.logs,
    contractAddress,
    txHash,
    explorerUrl,
    receipt.blockNumber,
  );
  const contract = new ethers.Contract(contractAddress, VEYA_ABI, provider);
  const commitmentChecks: CommitmentCheck[] = [];
  for (const proof of proofs) {
    if (proof.event !== "CommitmentStored") continue;
    const record = await readCommitment(contract, proof.digestHex);
    commitmentChecks.push({
      digestHex: proof.digestHex,
      onChain: record.exists,
      record,
    });
  }
  return { proofs, commitmentChecks };
}
