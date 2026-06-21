/**
 * Secure enclaves protected executions resource.
 */
import type { HttpClient } from "../client/http.js";
import type { Execution } from "../types/index.js";

export type ProtectedExecutionInput = {
  agentId: string;
  eventType: string;
  payload: Record<string, unknown>;
  discloseFields: string[];
  sealFields: string[];
  commitResult: boolean;
  spendLamports: number;
};

export type ProtectedExecutionResult = {
  execution: Execution;
  attestationTx?: string;
  commitmentHash?: string;
  disclosed?: Record<string, unknown>;
};

/**
 * Policy-checked execution with optional onchain attestation.
 * Sensitive fields are labeled disclose vs seal in the payload metadata returned by the API.
 */
export class ProtectionResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * ```ts
   * const result = await veya.protection.run(environmentId, {
   *   agentId,
   *   eventType: "treasury.transfer",
   *   payload: { amount: 100, currency: "USDC" },
   *   discloseFields: ["currency"],
   *   sealFields: ["amount"],
   *   commitResult: true,
   *   spendLamports: 1000,
   * });
   * console.log(result.attestationTx);
   * ```
   */
  async run(
    environmentId: string,
    input: ProtectedExecutionInput
  ): Promise<ProtectedExecutionResult> {
    return this.http.request<ProtectedExecutionResult>(
      `/v1/environments/${environmentId}/executions/protected`,
      { method: "POST", body: input }
    );
  }

  /**
   * Convenience wrapper for common disclose/seal patterns.
   */
  async runWithFieldLists(
    environmentId: string,
    params: {
      agentId: string;
      eventType: string;
      payload: Record<string, unknown>;
      disclose: string[];
      seal: string[];
      commit?: boolean;
      spendLamports?: number;
    }
  ): Promise<ProtectedExecutionResult> {
    return this.run(environmentId, {
      agentId: params.agentId,
      eventType: params.eventType,
      payload: params.payload,
      discloseFields: params.disclose,
      sealFields: params.seal,
      commitResult: params.commit ?? true,
      spendLamports: params.spendLamports ?? 1000,
    });
  }
}
