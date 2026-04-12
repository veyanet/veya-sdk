export type AgentType =
  | "research"
  | "coordination"
  | "memory"
  | "policy"
  | "presence"
  | "finance";

export type AgentStatus = "active" | "idle" | "executing" | "error";

export interface Agent {
  id: string;
  environmentId: string;
  type: AgentType;
  status: string;
  permissionConfig?: Record<string, unknown>;
  encryptedConfig?: string | null;
  configIv?: string | null;
  agentKind?: string | null;
  spendThisPeriod?: string;
  spendingPeriodStartedAt?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface DeployAgentInput {
  type: AgentType;
  permissionConfig: Record<string, unknown>;
  encryptedConfig?: string;
  configIv?: string;
  agentKind?: string;
}
