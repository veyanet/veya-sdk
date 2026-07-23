/**
 * Per-agent spending caps — enforced before consensus / sealed execution.
 * Amounts are wei on Robinhood Chain (native ETH), not Solana lamports.
 */

import { VeyaSdkError } from "../errors/veya-error.js";

export type SpendingLimit = {
  agentId: string;
  environmentId: string;
  maxAmount: bigint | number;
  periodSecs: number;
  spentAmount: bigint | number;
  periodStart: number;
};

const limits = new Map<string, SpendingLimit>();

function key(environmentId: string, agentId: string) {
  return `${environmentId}:${agentId}`;
}

export function setSpendingLimit(
  environmentId: string,
  agentId: string,
  maxAmount: bigint | number,
  periodSecs: number,
): SpendingLimit {
  const limit: SpendingLimit = {
    agentId,
    environmentId,
    maxAmount,
    periodSecs,
    spentAmount: 0,
    periodStart: Math.floor(Date.now() / 1000),
  };
  limits.set(key(environmentId, agentId), limit);
  return limit;
}

export function getSpendingLimit(
  environmentId: string,
  agentId: string,
): SpendingLimit | undefined {
  return limits.get(key(environmentId, agentId));
}

/** Returns true if spend is allowed; throws if over cap. */
export function recordSpend(
  environmentId: string,
  agentId: string,
  amount: bigint | number,
): boolean {
  const k = key(environmentId, agentId);
  const limit = limits.get(k);
  if (!limit) return true;

  const now = Math.floor(Date.now() / 1000);
  if (now - limit.periodStart >= limit.periodSecs) {
    limit.spentAmount = 0;
    limit.periodStart = now;
  }

  const nextSpent = BigInt(limit.spentAmount) + BigInt(amount);
  if (nextSpent > BigInt(limit.maxAmount)) {
    throw new VeyaSdkError(
      "SPENDING_EXCEEDED",
      `spending limit exceeded for agent ${agentId}: ${nextSpent} > ${limit.maxAmount}`,
      { agentId, environmentId, nextSpent: nextSpent.toString(), max: String(limit.maxAmount) },
    );
  }

  limit.spentAmount = nextSpent;
  limits.set(k, limit);
  return true;
}

export function checkSpendAllowed(
  environmentId: string,
  agentId: string,
  amount: bigint | number,
): boolean {
  const limit = limits.get(key(environmentId, agentId));
  if (!limit) return true;
  const now = Math.floor(Date.now() / 1000);
  const spent =
    now - limit.periodStart >= limit.periodSecs ? 0n : BigInt(limit.spentAmount);
  return spent + BigInt(amount) <= BigInt(limit.maxAmount);
}

export function remainingSpend(
  environmentId: string,
  agentId: string,
): bigint | null {
  const limit = getSpendingLimit(environmentId, agentId);
  if (!limit) return null;
  const now = Math.floor(Date.now() / 1000);
  const spent =
    now - limit.periodStart >= limit.periodSecs ? 0n : BigInt(limit.spentAmount);
  const rem = BigInt(limit.maxAmount) - spent;
  return rem < 0n ? 0n : rem;
}

export function clearSpendingLimits(): void {
  limits.clear();
}

export function listSpendingLimits(): SpendingLimit[] {
  return [...limits.values()];
}

export function assertPositiveWei(amount: bigint | number, label = "amount"): bigint {
  const v = BigInt(amount);
  if (v < 0n) {
    throw new VeyaSdkError("INVALID_CONFIG", `${label} must be non-negative wei`);
  }
  return v;
}

