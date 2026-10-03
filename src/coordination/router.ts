import { VeyaSdkError } from "../errors/veya-error.js";
import { signPQ, verifyPQ } from "../pq/mldsa.js";
import { establishKyberSession } from "./sessions.js";

export type McpMessage = {
  id: string;
  fromAgent: string;
  toAgent: string;
  tool: string;
  payload: unknown;
  policyStatus: "allowed" | "denied";
  kyberSessionId?: string;
  mlDsaSig?: string;
};

const policies = new Map<string, Set<string>>();

function policyKey(ownerScope: string, agentId: string): string {
  const scope = ownerScope?.trim() ?? "";
  if (!scope) {
    throw new VeyaSdkError("INVALID_CONFIG", "owner scope is required");
  }
  return `${scope}\0${agentId}`;
}

export function setToolPolicy(agentId: string, tool: string, allowed: boolean, ownerScope: string) {
  const key = policyKey(ownerScope, agentId);
  if (!policies.has(key)) policies.set(key, new Set());
  const set = policies.get(key)!;
  if (allowed) set.add(tool);
  else set.delete(tool);
}

export function routeMessage(msg: Omit<McpMessage, "policyStatus">, ownerScope: string): McpMessage {
  const allowed = policies.get(policyKey(ownerScope, msg.fromAgent))?.has(msg.tool) ?? false;
  return { ...msg, policyStatus: allowed ? "allowed" : "denied" };
}

export type SecureRouteOptions = {
  senderPublicKey: Uint8Array;
  senderPrivateKey: Uint8Array;
};

/** Policy check + Kyber-768 session + ML-DSA-44 signed envelope. */
export async function routeSecureMessage(
  msg: Omit<McpMessage, "policyStatus" | "kyberSessionId" | "mlDsaSig">,
  identity: SecureRouteOptions,
  ownerScope: string,
): Promise<McpMessage> {
  const routed = routeMessage(msg, ownerScope);
  if (routed.policyStatus === "denied") return routed;

  const session = await establishKyberSession(msg.fromAgent, msg.toAgent);
  const envelope = JSON.stringify({
    ...routed,
    kyberSessionId: session.sessionId,
  });
  const bytes = new TextEncoder().encode(envelope);
  const sig = await signPQ(bytes, identity.senderPrivateKey);

  return {
    ...routed,
    kyberSessionId: session.sessionId,
    mlDsaSig: Buffer.from(sig).toString("hex"),
  };
}

export async function verifySecureMessage(
  msg: McpMessage,
  senderPublicKey: Uint8Array,
): Promise<boolean> {
  if (!msg.mlDsaSig || !msg.kyberSessionId) return false;
  const { mlDsaSig, ...unsigned } = msg;
  const bytes = new TextEncoder().encode(JSON.stringify(unsigned));
  const sig = Buffer.from(mlDsaSig, "hex");
  return verifyPQ(sig, bytes, senderPublicKey);
}

export function listToolPolicy(agentId: string, ownerScope: string): string[] {
  return [...(policies.get(policyKey(ownerScope, agentId)) ?? [])].sort();
}

export function clearToolPolicies(): void {
  policies.clear();
}

export function isToolAllowed(agentId: string, tool: string, ownerScope: string): boolean {
  return policies.get(policyKey(ownerScope, agentId))?.has(tool) ?? false;
}

export function requireAllowedTool(agentId: string, tool: string, ownerScope: string): void {
  if (!isToolAllowed(agentId, tool, ownerScope)) {
    throw new Error(`tool ${tool} is not in policy for agent ${agentId}`);
  }
}

export const VEYA_TOOL_PREFIX = "veya_";

export function isVeyaToolName(tool: string): boolean {
  return tool.startsWith(VEYA_TOOL_PREFIX);
}
