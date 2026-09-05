import { ethers } from "ethers";
import { VEYA_ABI } from "../abi/index.js";
import { explorerTxUrl } from "../chain.js";
import { resolveConfig, type VeyaClientConfig } from "../config.js";
import {
  VeyaSdkError,
  assertBytesLength,
  fromAnchorRevert,
} from "../errors/veya-error.js";
import * as pq from "../pq/index.js";
import { ENVIRONMENT_TYPES } from "../program/instructions.js";

/**
 * EVM anchoring client — submits real Robinhood Chain transactions to Veya.sol.
 *
 * Requires a funded payer key. The constructor does not send a transaction;
 * the first write verifies that the RPC chain id matches the configured
 * Robinhood chain id (46630 on testnet) so a mis-pointed RPC cannot silently
 * land on another EVM.
 *
 * Read helpers (getCommitment, getNullifier, …) also work through this contract
 * instance; for no-key reads prefer VeyaClient.read* helpers.
 */
export class EvmAnchor {
  readonly provider: ethers.JsonRpcProvider;
  readonly contract: ethers.Contract;
  readonly wallet: ethers.Wallet;
  readonly chainId: number;
  readonly explorerUrl: string;
  readonly contractAddress: string;

  private networkChecked = false;

  constructor(config: VeyaClientConfig & { payerPrivateKey: string }) {
    const resolved = resolveConfig(config);
    this.chainId = resolved.chainId;
    this.explorerUrl = resolved.explorerUrl;
    this.contractAddress = resolved.contractAddress;
    // Do not pin staticNetwork — getNetwork() must query eth_chainId so a
    // mis-pointed RPC cannot pretend to be Robinhood Chain.
    this.provider = new ethers.JsonRpcProvider(resolved.rpcUrl);
    this.wallet = new ethers.Wallet(config.payerPrivateKey, this.provider);
    this.contract = new ethers.Contract(resolved.contractAddress, VEYA_ABI, this.wallet);
  }

  explorerFor(txHash: string): string {
    return explorerTxUrl(txHash, this.explorerUrl);
  }

  /**
   * Confirm the JSON-RPC node is Robinhood Chain (or the configured chainId).
   * Called before every write so a wrong RPC cannot be used by accident.
   */
  async ensureRobinhoodChain(): Promise<void> {
    if (this.networkChecked) return;
    const network = await this.provider.getNetwork();
    if (network.chainId !== BigInt(this.chainId)) {
      throw new VeyaSdkError(
        "CHAIN_MISMATCH",
        `VEYA SDK expected chain id ${this.chainId} (Robinhood Chain), RPC returned ${network.chainId}`,
        { expected: this.chainId, actual: network.chainId.toString() },
      );
    }
    this.networkChecked = true;
  }

  private async send(txPromise: Promise<ethers.ContractTransactionResponse>): Promise<string> {
    await this.ensureRobinhoodChain();
    try {
      const tx = await txPromise;
      const receipt = await tx.wait();
      if (!receipt?.hash) {
        throw new VeyaSdkError("ANCHOR_REVERT", "transaction mined without a hash");
      }
      return receipt.hash;
    } catch (err) {
      throw fromAnchorRevert(err);
    }
  }

  /** Register environment on-chain with PQ pubkey hash. */
  async registerEnvironment(
    environmentUuid: Uint8Array,
    pqPubkeyHash: Uint8Array,
    envType: number,
  ): Promise<string> {
    assertBytesLength(environmentUuid, 16, "environmentUuid");
    assertBytesLength(pqPubkeyHash, 32, "pqPubkeyHash");
    return this.send(
      this.contract.registerEnvironment(
        ethers.hexlify(environmentUuid),
        ethers.hexlify(pqPubkeyHash),
        envType,
      ),
    );
  }

  /** Register agent under environment. */
  async registerAgent(
    environmentUuid: Uint8Array,
    agentUuid: Uint8Array,
    agentRole: number,
    agentPqHash: Uint8Array,
  ): Promise<string> {
    assertBytesLength(environmentUuid, 16, "environmentUuid");
    assertBytesLength(agentUuid, 16, "agentUuid");
    assertBytesLength(agentPqHash, 32, "agentPqHash");
    return this.send(
      this.contract.registerAgent(
        ethers.hexlify(environmentUuid),
        ethers.hexlify(agentUuid),
        agentRole,
        ethers.hexlify(agentPqHash),
      ),
    );
  }

  /** Store a 32-byte BLAKE3 (or content) commitment on-chain. */
  async storeCommitment(environmentUuid: Uint8Array, commitment: Uint8Array): Promise<string> {
    assertBytesLength(environmentUuid, 16, "environmentUuid");
    assertBytesLength(commitment, 32, "commitment");
    return this.send(
      this.contract.storeCommitment(ethers.hexlify(environmentUuid), ethers.hexlify(commitment)),
    );
  }

  /** Anchor PQ attestation (identity hash + execution hash). */
  async anchorPqAttestation(
    environmentUuid: Uint8Array,
    identityHash: Uint8Array,
    executionHash: Uint8Array,
  ): Promise<string> {
    assertBytesLength(environmentUuid, 16, "environmentUuid");
    assertBytesLength(identityHash, 32, "identityHash");
    assertBytesLength(executionHash, 32, "executionHash");
    return this.send(
      this.contract.anchorPqAttestation(
        ethers.hexlify(environmentUuid),
        ethers.hexlify(identityHash),
        ethers.hexlify(executionHash),
      ),
    );
  }

  /** Attest execution with optional ML-DSA signature bytes. */
  async attestExecution(
    environmentUuid: Uint8Array,
    blake3Hash: Uint8Array,
    mldsaSig: Uint8Array,
  ): Promise<string> {
    assertBytesLength(environmentUuid, 16, "environmentUuid");
    assertBytesLength(blake3Hash, 32, "blake3Hash");
    return this.send(
      this.contract.attestExecution(
        ethers.hexlify(environmentUuid),
        ethers.hexlify(blake3Hash),
        mldsaSig,
      ),
    );
  }

  /** Init spending limit for an agent (wei units on Robinhood Chain). */
  async initSpendingLimit(
    agentUuid: Uint8Array,
    maxAmount: bigint,
    periodSecs: number,
  ): Promise<string> {
    assertBytesLength(agentUuid, 16, "agentUuid");
    return this.send(this.contract.initSpendingLimit(ethers.hexlify(agentUuid), maxAmount, periodSecs));
  }

  /** Record spend amount against the on-chain cap (Veya.sol). */
  async recordSpend(agentUuid: Uint8Array, amount: bigint): Promise<string> {
    assertBytesLength(agentUuid, 16, "agentUuid");
    return this.send(this.contract.recordSpend(ethers.hexlify(agentUuid), amount));
  }

  /** Define MCP tool policy for an agent. */
  async defineToolPolicy(
    environmentUuid: Uint8Array,
    agentUuid: Uint8Array,
    toolName: string,
    allowed: boolean,
  ): Promise<string> {
    assertBytesLength(environmentUuid, 16, "environmentUuid");
    assertBytesLength(agentUuid, 16, "agentUuid");
    return this.send(
      this.contract.defineToolPolicy(
        ethers.hexlify(environmentUuid),
        ethers.hexlify(agentUuid),
        toolName,
        allowed,
      ),
    );
  }

  /** Flag memory nullifier (spend-once). */
  async flagMemoryNullifier(environmentUuid: Uint8Array, memoryId: Uint8Array): Promise<string> {
    assertBytesLength(environmentUuid, 16, "environmentUuid");
    assertBytesLength(memoryId, 16, "memoryId");
    return this.send(
      this.contract.flagMemoryNullifier(ethers.hexlify(environmentUuid), ethers.hexlify(memoryId)),
    );
  }

  /** Store sealed state chunk (ciphertext stays large; chain stores hash + chunk). */
  async storeSealedState(
    environmentUuid: Uint8Array,
    stateId: Uint8Array,
    chunkIndex: number,
    blake3CiphertextHash: Uint8Array,
    ciphertextChunk: Uint8Array,
  ): Promise<string> {
    assertBytesLength(environmentUuid, 16, "environmentUuid");
    assertBytesLength(stateId, 16, "stateId");
    assertBytesLength(blake3CiphertextHash, 32, "blake3CiphertextHash");
    return this.send(
      this.contract.storeSealedState(
        ethers.hexlify(environmentUuid),
        ethers.hexlify(stateId),
        chunkIndex,
        ethers.hexlify(blake3CiphertextHash),
        ciphertextChunk,
      ),
    );
  }

  /** Read environment record from Veya.sol. */
  async getEnvironment(environmentUuid: Uint8Array) {
    assertBytesLength(environmentUuid, 16, "environmentUuid");
    return this.contract.environments(ethers.hexlify(environmentUuid));
  }

  /** True when `commitments(digest)` is set on Veya.sol. */
  async getCommitment(commitment: Uint8Array): Promise<boolean> {
    assertBytesLength(commitment, 32, "commitment");
    return Boolean(await this.contract.commitments(ethers.hexlify(commitment)));
  }

  /** True when memory nullifier is flagged. */
  async getNullifier(memoryId: Uint8Array): Promise<boolean> {
    assertBytesLength(memoryId, 16, "memoryId");
    return Boolean(await this.contract.nullifiers(ethers.hexlify(memoryId)));
  }

  /** On-chain spending limit tuple for an agent. */
  async getSpendingLimitOnChain(agentUuid: Uint8Array) {
    assertBytesLength(agentUuid, 16, "agentUuid");
    return this.contract.spendingLimits(ethers.hexlify(agentUuid));
  }

  /** Agent record from Veya.sol. */
  async getAgent(agentUuid: Uint8Array) {
    assertBytesLength(agentUuid, 16, "agentUuid");
    return this.contract.agents(ethers.hexlify(agentUuid));
  }

  /** Attestation mapping for a BLAKE3 hash. */
  async getAttestation(blake3Hash: Uint8Array) {
    assertBytesLength(blake3Hash, 32, "blake3Hash");
    return this.contract.attestations(ethers.hexlify(blake3Hash));
  }

  /** Anchor memo with BLAKE3 hash (storeCommitment). */
  async anchorMemo(environmentUuid: Uint8Array, blake3Hex: string): Promise<string> {
    const hex = blake3Hex.replace(/^0x/, "");
    const commitment = Uint8Array.from(Buffer.from(hex, "hex"));
    return this.storeCommitment(environmentUuid, commitment);
  }

  /**
   * Full PQ identity registration: keygen + on-chain env + commitment.
   * Returns the ML-DSA private key — caller must custody it; the SDK does not persist it.
   */
  async registerPqIdentity(envType: number = ENVIRONMENT_TYPES.SecureEnclave): Promise<{
    publicKey: Uint8Array;
    privateKey: Uint8Array;
    publicKeyHash: string;
    environmentUuid: Uint8Array;
    environmentTx: string;
    memoTx: string;
    explorer: { environment: string; memo: string };
  }> {
    const { publicKey, privateKey } = await pq.generatePQIdentity();
    if (!publicKey || !privateKey) throw new Error("PQ keygen failed");
    const hashHex = await pq.publicKeyHashBlake3(publicKey);
    const hashBytes = Uint8Array.from(Buffer.from(hashHex, "hex"));
    const uuid = crypto.getRandomValues(new Uint8Array(16));
    const envTx = await this.registerEnvironment(uuid, hashBytes, envType);
    const memoTx = await this.anchorMemo(uuid, hashHex);
    return {
      publicKey,
      privateKey,
      publicKeyHash: hashHex,
      environmentUuid: uuid,
      environmentTx: envTx,
      memoTx,
      explorer: {
        environment: this.explorerFor(envTx),
        memo: this.explorerFor(memoTx),
      },
    };
  }
}