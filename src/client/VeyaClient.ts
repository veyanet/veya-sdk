import { ethers } from "ethers";
import { VEYA_ABI } from "../abi/index.js";
import { explorerTxUrl, pingRpc } from "../chain.js";
import { resolveConfig, describeConfig, type ResolvedVeyaConfig, type VeyaClientConfig } from "../config.js";
import { runConsensus } from "../compute/consensus.js";
import { VeyaSdkError, assertBytesLength, assertHex32 } from "../errors/veya-error.js";
import * as pq from "../pq/index.js";
import { ENVIRONMENT_TYPES } from "../program/instructions.js";
import { protectedExec } from "../sealed/protectedExec.js";
import { requireVerifiedSeal } from "../sealed/types.js";
import {
  parseAllProofsFromTransaction,
  parseProofFromTransaction,
} from "./receipts.js";
import { EvmAnchor } from "./evm.js";

/**
 * High-level VEYA SDK client — local PQ crypto, Robinhood Chain anchoring, consensus, sealed exec.
 *
 * Construct without a private key for hashing, verify, and on-chain reads.
 * Pass payerPrivateKey (or VEYA_DEPLOYER_PRIVATE_KEY) to enable EvmAnchor writes.
 */
export class VeyaClient {
  readonly config: ResolvedVeyaConfig;
  evm?: EvmAnchor;

  constructor(config: VeyaClientConfig = {}) {
    this.config = resolveConfig(config);
    const privateKey = config.payerPrivateKey ?? this.config.payerPrivateKey;
    if (privateKey) {
      this.evm = new EvmAnchor({
        ...config,
        payerPrivateKey: privateKey,
      });
    }
  }

  /** Read-only contract (no wallet). Used for stranger verify paths. */
  private reader(): ethers.Contract {
    const provider = new ethers.JsonRpcProvider(this.config.rpcUrl);
    return new ethers.Contract(this.config.contractAddress, VEYA_ABI, provider);
  }

  describe(): Record<string, unknown> {
    return describeConfig(this.config);
  }

  explorerFor(txHash: string): string {
    return explorerTxUrl(txHash, this.config.explorerUrl);
  }

  async pingChain() {
    const ping = await pingRpc(this.config.rpcUrl);
    if (ping.chainId !== BigInt(this.config.chainId)) {
      throw new VeyaSdkError("CHAIN_MISMATCH", "RPC chain id does not match SDK config", {
        expected: this.config.chainId,
        actual: ping.chainId.toString(),
      });
    }
    return ping;
  }

  async pqKeygen() {
    return pq.generatePQIdentity();
  }

  async hashBlake3(data: string | Uint8Array) {
    return pq.hashBlake3(data);
  }

  requireEvm(): EvmAnchor {
    if (!this.evm) {
      throw new VeyaSdkError(
        "MISSING_PAYER",
        "payerPrivateKey required for on-chain ops on Robinhood Chain",
      );
    }
    return this.evm;
  }

  async registerPqOnchain(envType: number = ENVIRONMENT_TYPES.SecureEnclave) {
    return this.requireEvm().registerPqIdentity(envType);
  }

  async runConsensus(taskId: string, payload: object) {
    return runConsensus(this.config.validatorNodes, taskId, payload, {
      timeoutMs: this.config.requestTimeoutMs,
    });
  }

  async protectedExecute(params: {
    environmentId: string;
    agentId: string;
    eventType: string;
    payload: object;
    sessionEntropy: Uint8Array;
  }) {
    const result = await protectedExec(this.config.sealedNodeUrl, params, {
      timeoutMs: this.config.requestTimeoutMs,
    });
    return requireVerifiedSeal(result);
  }

  /** Parse the first Veya.sol event on a transaction (legacy helper). */
  async verifyTransaction(txHash: string) {
    const provider = new ethers.JsonRpcProvider(this.config.rpcUrl);
    return parseProofFromTransaction(
      provider,
      txHash,
      this.config.contractAddress,
      this.config.explorerUrl,
    );
  }

  /** Parse every Veya.sol event on a transaction. */
  async verifyTransactionAll(txHash: string) {
    const provider = new ethers.JsonRpcProvider(this.config.rpcUrl);
    return parseAllProofsFromTransaction(
      provider,
      txHash,
      this.config.contractAddress,
      this.config.explorerUrl,
    );
  }

  /**
   * Stranger verify: parse tx events AND eth_call `commitments(digest)`.
   * No private key required.
   */
  async verifyCommitmentOnChain(txHash: string): Promise<{
    proofs: Awaited<ReturnType<typeof parseAllProofsFromTransaction>>;
    commitmentChecks: Array<{ digestHex: string; onChain: boolean }>;
  }> {
    const proofs = await this.verifyTransactionAll(txHash);
    const checks: Array<{ digestHex: string; onChain: boolean }> = [];
    for (const p of proofs) {
      if (p.event !== "CommitmentStored") continue;
      const onChain = await this.commitmentExists(p.digestHex);
      checks.push({ digestHex: p.digestHex, onChain });
    }
    return { proofs, commitmentChecks: checks };
  }

  /** eth_call Veya.sol commitments(bytes32) — no key. */
  async commitmentExists(digestHex: string): Promise<boolean> {
    const hex = assertHex32(digestHex, "commitment");
    const bytes = Uint8Array.from(Buffer.from(hex, "hex"));
    return Boolean(await this.reader().commitments(ethers.hexlify(bytes)));
  }

  async nullifierExists(memoryId: Uint8Array): Promise<boolean> {
    assertBytesLength(memoryId, 16, "memoryId");
    return Boolean(await this.reader().nullifiers(ethers.hexlify(memoryId)));
  }

  async readEnvironment(environmentUuid: Uint8Array) {
    assertBytesLength(environmentUuid, 16, "environmentUuid");
    return this.reader().environments(ethers.hexlify(environmentUuid));
  }

  async readSpendingLimit(agentUuid: Uint8Array) {
    assertBytesLength(agentUuid, 16, "agentUuid");
    return this.reader().spendingLimits(ethers.hexlify(agentUuid));
  }

  async readAgent(agentUuid: Uint8Array) {
    assertBytesLength(agentUuid, 16, "agentUuid");
    return this.reader().agents(ethers.hexlify(agentUuid));
  }
}