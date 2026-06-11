import type { HttpClient } from "../client/http.js";
import type { Execution } from "../types/index.js";

export type DecentralizedNodeAttestation = {
  nodeId: string;
  publicKey: string;
  signature: string;
  status: string;
};

export type DecentralizedConsensus = {
  consensusReached: boolean;
  nodesCount: number;
  nodes: DecentralizedNodeAttestation[];
  stateHash: string;
};

export type DecentralizedExecutionInput = {
  agentId: string;
  eventType: string;
  payload: Record<string, unknown>;
  nodesCount?: number;
  commitResult?: boolean;
  spendLamports?: number;
};

export type DecentralizedExecutionResult = {
  execution: Execution;
  consensus: DecentralizedConsensus;
  attestationTx: string | null;
};

/**
 * Decentralized execution resource for orchestrating tasks across multiple validator nodes.
 */
export class DecentralizedComputeResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Run a task inside a decentralized compute environment, collecting cryptographic signatures
   * from active validation nodes.
   *
   * ```ts
   * const result = await veya.compute.run(environmentId, {
   *   agentId,
   *   eventType: "treasury.settlement",
   *   payload: { amount: 500 },
   *   nodesCount: 3,
   *   commitResult: true,
   * });
   * console.log(result.consensus.consensusReached);
   * ```
   */
  async run(
    environmentId: string,
    input: DecentralizedExecutionInput
  ): Promise<DecentralizedExecutionResult> {
    return this.http.request<DecentralizedExecutionResult>(
      `/v1/environments/${environmentId}/executions/decentralized`,
      {
        method: "POST",
        body: {
          agentId: input.agentId,
          eventType: input.eventType,
          payload: input.payload,
          nodesCount: input.nodesCount ?? 3,
          commitResult: input.commitResult ?? true,
          spendLamports: input.spendLamports ?? 1000,
        },
      }
    );
  }
}
