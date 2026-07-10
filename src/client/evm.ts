import { ethers } from "ethers";
import { VEYA_ABI } from "../abi/index.js";
import { explorerTxUrl } from "../chain.js";
import { resolveConfig, type VeyaClientConfig } from "../config.js";
import { VeyaSdkError, fromAnchorRevert } from "../errors/veya-error.js";
import * as pq from "../pq/index.js";

/**
 * EVM anchoring client — submits real Robinhood Chain transactions to Veya.sol.
 *
 * Requires a funded payer key. The constructor does not send a transaction;
 * the first write verifies that the RPC chain id matches the configured
 * Robinhood chain id (46630 on testnet) so a mis-pointed RPC cannot silently
 * land on another EVM.
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
    return this.send(this.contract.initSpendingLimit(ethers.hexlify(agentUuid), maxAmount, periodSecs));
  }

  /** Record spend amount against the on-chain cap. */
  async recordSpend(agentUuid: Uint8Array, amount: bigint): Promise<string> {
    return this.send(this.contract.recordSpend(ethers.hexlify(agentUuid), amount));
  }

  /** Define MCP tool policy for an agent. */
  async defineToolPolicy(
    environmentUuid: Uint8Array,
    agentUuid: Uint8Array,
    toolName: string,
    allowed: boolean,
  ): Promise<string> {
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
    return this.contract.environments(ethers.hexlify(environmentUuid));
  }

  /** Anchor memo with BLAKE3 hash (storeCommitment). */
  async anchorMemo(environmentUuid: Uint8Array, blake3Hex: string): Promise<string> {
    const commitment = Uint8Array.from(Buffer.from(blake3Hex.replace(/^0x/, ""), "hex"));
    return this.storeCommitment(environmentUuid, commitment);
  }

  /** Full PQ identity registration: keygen + on-chain env + commitment. */
  async registerPqIdentity(envType = 1): Promise<{
    publicKey: Uint8Array;
    publicKeyHash: string;
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
      publicKeyHash: hashHex,
      environmentTx: envTx,
      memoTx,
      explorer: {
        environment: this.explorerFor(envTx),
        memo: this.explorerFor(memoTx),
      },
    };
  }
}
