/**
 * Policy Agent — governance gate for treasury / high-risk agent actions.
 * Amounts are wei on Robinhood Chain (EVM). This is an off-chain pre-check;
 * on-chain caps still live in Veya.sol initSpendingLimit / recordSpend.
 */

import { checkSpendAllowed, remainingSpend } from "../spending/limits.js";
import { isVeyaToolName, routeMessage, type McpMessage } from "./router.js";

export type PolicyDecision = {
  allowed: boolean;
  reason: string;
  routed?: McpMessage;
};

export type PolicyAgentConfig = {
  environmentId: string;
  agentId: string;
  /** Per-action cap in wei (native ETH on Robinhood Chain). */
  maxWeiPerAction?: number;
  requireConsensus?: boolean;
  veyaToolsOnly?: boolean;
};

export class PolicyAgent {
  constructor(readonly config: PolicyAgentConfig) {}

  evaluateToolCall(msg: Omit<McpMessage, "policyStatus">): PolicyDecision {
    if (this.config.veyaToolsOnly && !isVeyaToolName(msg.tool)) {
      return { allowed: false, reason: "only veya_* tools are permitted in this environment" };
    }

    const routed = routeMessage(msg);
    if (routed.policyStatus === "denied") {
      return { allowed: false, reason: "tool not in agent policy", routed };
    }

    if (this.config.maxWeiPerAction != null) {
      const ok = checkSpendAllowed(
        this.config.environmentId,
        msg.fromAgent,
        this.config.maxWeiPerAction,
      );
      if (!ok) {
        return { allowed: false, reason: "spending cap would be exceeded", routed };
      }
    }

    return { allowed: true, reason: "policy ok", routed };
  }

  gateConsensus(required: boolean): PolicyDecision {
    if (required && this.config.requireConsensus) {
      return { allowed: true, reason: "consensus required and enabled" };
    }
    if (this.config.requireConsensus && !required) {
      return { allowed: false, reason: "consensus required for this environment" };
    }
    return { allowed: true, reason: "consensus optional" };
  }

  remainingWei(): bigint | null {
    return remainingSpend(this.config.environmentId, this.config.agentId);
  }

  describe(): Record<string, unknown> {
    return {
      environmentId: this.config.environmentId,
      agentId: this.config.agentId,
      maxWeiPerAction: this.config.maxWeiPerAction ?? null,
      requireConsensus: Boolean(this.config.requireConsensus),
      veyaToolsOnly: Boolean(this.config.veyaToolsOnly),
      remainingWei: this.remainingWei()?.toString() ?? null,
    };
  }
}

export function deny(reason: string): PolicyDecision {
  return { allowed: false, reason };
}

export function allow(reason: string, routed?: McpMessage): PolicyDecision {
  return { allowed: true, reason, routed };
}

export function isAllowed(decision: PolicyDecision): boolean {
  return decision.allowed;
}
