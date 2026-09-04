/**
 * Veya.sol function names on Robinhood Chain.
 *
 * These are Solidity camelCase identifiers. The Solana program used
 * snake_case instruction names; that mapping does not apply here.
 * EvmAnchor methods use the same names as this list.
 */

export const INSTRUCTION_NAMES = [
  "registerEnvironment",
  "registerAgent",
  "attestExecution",
  "anchorPqAttestation",
  "storeCommitment",
  "initSpendingLimit",
  "recordSpend",
  "defineToolPolicy",
  "flagMemoryNullifier",
  "storeSealedState",
] as const;

export type InstructionName = (typeof INSTRUCTION_NAMES)[number];

/**
 * Matches `enum EnvironmentType` in Veya.sol:
 * Execution = 0, SecureEnclave = 1, Governance = 2.
 *
 * Legacy aliases Isolated/Shared kept for older call sites (same numeric values).
 */
export const ENVIRONMENT_TYPES = {
  Execution: 0,
  SecureEnclave: 1,
  Governance: 2,
  /** @deprecated Use Execution — same value as Veya.sol Execution */
  Isolated: 0,
  /** @deprecated Use SecureEnclave — same value as Veya.sol SecureEnclave */
  Shared: 1,
} as const;

export type EnvironmentTypeName = keyof typeof ENVIRONMENT_TYPES;

export const AGENT_ROLES = {
  Operator: 0,
  Worker: 1,
  Treasury: 2,
} as const;

export type AgentRoleName = keyof typeof AGENT_ROLES;

export function isInstructionName(value: string): value is InstructionName {
  return (INSTRUCTION_NAMES as readonly string[]).includes(value);
}

export function environmentTypeCode(name: EnvironmentTypeName): number {
  return ENVIRONMENT_TYPES[name];
}

export function agentRoleCode(name: AgentRoleName): number {
  return AGENT_ROLES[name];
}

/** Human-readable ABI fragments for the write surface (tests / unsigned tx builders). */
export const VEYA_WRITE_SIGNATURES: Record<InstructionName, string> = {
  registerEnvironment: "registerEnvironment(bytes16,bytes32,uint8)",
  registerAgent: "registerAgent(bytes16,bytes16,uint8,bytes32)",
  attestExecution: "attestExecution(bytes16,bytes32,bytes)",
  anchorPqAttestation: "anchorPqAttestation(bytes16,bytes32,bytes32)",
  storeCommitment: "storeCommitment(bytes16,bytes32)",
  initSpendingLimit: "initSpendingLimit(bytes16,uint256,uint64)",
  recordSpend: "recordSpend(bytes16,uint256)",
  defineToolPolicy: "defineToolPolicy(bytes16,bytes16,string,bool)",
  flagMemoryNullifier: "flagMemoryNullifier(bytes16,bytes16)",
  storeSealedState: "storeSealedState(bytes16,bytes16,uint16,bytes32,bytes)",
};

export function writeSignature(name: InstructionName): string {
  return VEYA_WRITE_SIGNATURES[name];
}

export function allWriteSignatures(): string[] {
  return INSTRUCTION_NAMES.map((n) => VEYA_WRITE_SIGNATURES[n]);
}

export function isSnakeCaseInstruction(name: string): boolean {
  return name.includes("_");
}