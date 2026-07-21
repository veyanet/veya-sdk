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

export function setToolPolicy(agentId: string, tool: string, allowed: boolean) {
  if (!policies.has(agentId)) policies.set(agentId, new Set());
  const set = policies.get(agentId)!;
  if (allowed) set.add(tool);
  else set.delete(tool);
}

export function routeMessage(msg: Omit<McpMessage, "policyStatus">): McpMessage {
  const allowed = policies.get(msg.fromAgent)?.has(msg.tool) ?? false;
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
): Promise<McpMessage> {
  const routed = routeMessage(msg);
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

export function listToolPolicy(agentId: string): string[] {
  return [...(policies.get(agentId) ?? [])].sort();
}

export function clearToolPolicies(): void {
  policies.clear();
}

export function isToolAllowed(agentId: string, tool: string): boolean {
  return policies.get(agentId)?.has(tool) ?? false;
}

export function requireAllowedTool(agentId: string, tool: string): void {
  if (!isToolAllowed(agentId, tool)) {
    throw new Error(`tool ${tool} is not in policy for agent ${agentId}`);
  }
}

export const VEYA_TOOL_PREFIX = "veya_";

export function isVeyaToolName(tool: string): boolean {
  return tool.startsWith(VEYA_TOOL_PREFIX);
}
