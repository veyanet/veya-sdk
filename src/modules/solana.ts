/**
 * Solana cluster PDA and program instructions parser.
 */
import type { HttpClient } from "../client/http.js";
import type { Environment } from "../types/index.js";

export type ClusterInfo = {
  cluster: string;
  rpcUrl: string;
  programId: string;
};

export class SolanaResource {
  constructor(private readonly http: HttpClient) {}

  async cluster(): Promise<ClusterInfo> {
    return this.http.request<ClusterInfo>("/v1/solana/cluster");
  }

  async environmentRegistration(environmentId: string): Promise<{
    registration: Record<string, unknown>;
    environment: Environment;
  }> {
    return this.http.request(`/v1/solana/environments/${environmentId}/registration`);
  }

  async confirmEnvironmentRegistration(
    environmentId: string,
    transactionSignature: string
  ): Promise<{ ok: boolean; environmentPda: string; signature: string }> {
    return this.http.request(
      `/v1/solana/environments/${environmentId}/confirm-registration`,
      { method: "POST", body: { transactionSignature } }
    );
  }

  async agentRegistration(agentId: string): Promise<{
    registration: Record<string, unknown>;
    agent: Record<string, unknown>;
  }> {
    return this.http.request(`/v1/solana/agents/${agentId}/registration`);
  }

  async confirmAgentRegistration(
    agentId: string,
    transactionSignature: string
  ): Promise<{ ok: boolean; agentPda: string; signature: string }> {
    return this.http.request(`/v1/solana/agents/${agentId}/confirm-registration`, {
      method: "POST",
      body: { transactionSignature },
    });
  }

  /**
   * Build an unsigned attestation transaction for a wallet to sign.
   *
   * ```ts
   * const tx = await veya.solana.buildUnsignedAttestation({ amount: 1 }, feePayerPubkey);
   * ```
   */
  async buildUnsignedAttestation(
    executionPayload: Record<string, unknown>,
    feePayer: string
  ): Promise<{ hash: string; serialized: string; uri: string }> {
    return this.http.request("/v1/solana/attestation/unsigned", {
      method: "POST",
      body: { executionPayload, feePayer },
    });
  }
}
