import { explorerTxUrl, pingRpc } from "../chain.js";
import { resolveConfig, describeConfig, type ResolvedVeyaConfig, type VeyaClientConfig } from "../config.js";
import { runConsensus } from "../compute/consensus.js";
import { VeyaSdkError } from "../errors/veya-error.js";
import * as pq from "../pq/index.js";
import { protectedExec } from "../sealed/protectedExec.js";
import { requireVerifiedSeal } from "../sealed/types.js";
import { parseProofFromTransaction } from "./receipts.js";
import { EvmAnchor } from "./evm.js";

/**
 * High-level VEYA SDK client — local PQ crypto, Robinhood Chain anchoring, consensus, sealed exec.
 *
 * Construct without a private key for hashing / consensus / sealed-node calls.
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

  async registerPqOnchain(envType = 1) {
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

  async verifyTransaction(txHash: string) {
    const { ethers } = await import("ethers");
    const provider = new ethers.JsonRpcProvider(this.config.rpcUrl);
    return parseProofFromTransaction(
      provider,
      txHash,
      this.config.contractAddress,
      this.config.explorerUrl,
    );
  }
}
