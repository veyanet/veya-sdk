export type EnvironmentType =
  | "research"
  | "governance"
  | "treasury"
  | "contributor"
  | "protocol"
  | "desci";

export type EnvironmentStatus = "active" | "paused" | "archived";

export interface Environment {
  id: string;
  name: string;
  type: EnvironmentType;
  status: string;
  ownerWallet: string;
  memoryScope?: Record<string, unknown>;
  policyConfig?: Record<string, unknown>;
  spendingLimits?: Record<string, unknown>;
  agentRoster?: string[];
  createdAt: string;
  updatedAt?: string;
}

export function isEnvironmentType(value: string): value is EnvironmentType {
  return (
    value === "research" ||
    value === "governance" ||
    value === "treasury" ||
    value === "contributor" ||
    value === "protocol" ||
    value === "desci"
  );
}
