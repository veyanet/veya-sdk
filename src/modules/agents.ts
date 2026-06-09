/**
 * Agents workspace resource endpoints.
 */
import type { HttpClient } from "../client/http.js";
import type { Agent, AgentStatus, DeployAgentInput } from "../types/index.js";

export type UpdateAgentInput = Partial<{
  status: AgentStatus;
  permissionConfig: Record<string, unknown>;
  encryptedConfig: string;
  configIv: string;
}>;

export class AgentsResource {
  constructor(private readonly http: HttpClient) {}

  async list(environmentId: string): Promise<Agent[]> {
    const { agents } = await this.http.request<{ agents: Agent[] }>(
      `/v1/environments/${environmentId}/agents`
    );
    return agents;
  }

  async deploy(environmentId: string, input: DeployAgentInput): Promise<Agent> {
    const { agent } = await this.http.request<{ agent: Agent }>(
      `/v1/environments/${environmentId}/agents`,
      { method: "POST", body: input }
    );
    return agent;
  }

  async update(
    environmentId: string,
    agentId: string,
    input: UpdateAgentInput
  ): Promise<Agent> {
    const { agent } = await this.http.request<{ agent: Agent }>(
      `/v1/environments/${environmentId}/agents/${agentId}`,
      { method: "PATCH", body: input }
    );
    return agent;
  }

  /**
   * Deploy with encrypted config produced by `encryptAgentConfig`.
   *
   * ```ts
   * import { Veya, encryptAgentConfig } from "@veya/sdk";
   * const { encryptedConfig, configIv } = await encryptAgentConfig({ tools: ["transfer"] }, passphrase);
   * await veya.agents.deploy(envId, { type: "finance", permissionConfig: { allowedTools: ["transfer"] }, encryptedConfig, configIv });
   * ```
   */
  async deployEncrypted(
    environmentId: string,
    input: DeployAgentInput & { encryptedConfig: string; configIv: string }
  ): Promise<Agent> {
    return this.deploy(environmentId, input);
  }
}
