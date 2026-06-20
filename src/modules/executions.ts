/**
 * Execution logs trace and observability observer.
 */
import type { HttpClient } from "../client/http.js";
import type { Execution } from "../types/index.js";

export type CreateExecutionInput = {
  eventType: string;
  payload: Record<string, unknown>;
  protected: boolean;
  spendLamports: number;
  agentId?: string;
};

export class ExecutionsResource {
  constructor(private readonly http: HttpClient) {}

  async list(environmentId: string): Promise<Execution[]> {
    const { executions } = await this.http.request<{ executions: Execution[] }>(
      `/v1/environments/${environmentId}/executions`
    );
    return executions;
  }

  async create(environmentId: string, input: CreateExecutionInput): Promise<Execution> {
    const { execution } = await this.http.request<{ execution: Execution }>(
      `/v1/environments/${environmentId}/executions`,
      { method: "POST", body: input }
    );
    return execution;
  }

  /**
   * Standard (non-protected) execution for observability and spend tracking.
   *
   * ```ts
   * await veya.executions.create(envId, {
   *   eventType: "treasury.check",
   *   payload: { ok: true },
   *   protected: false,
   *   spendLamports: 0,
   *   agentId,
   * });
   * ```
   */
  async runStandard(
    environmentId: string,
    params: {
      eventType: string;
      payload: Record<string, unknown>;
      agentId?: string;
      spendLamports?: number;
    }
  ): Promise<Execution> {
    return this.create(environmentId, {
      eventType: params.eventType,
      payload: params.payload,
      protected: false,
      spendLamports: params.spendLamports ?? 0,
      agentId: params.agentId,
    });
  }
}
