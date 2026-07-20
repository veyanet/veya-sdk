/**
 * 2-of-3 validator consensus over BLAKE3 execution hashes.
 *
 * Each node POSTs /execute, hashes the payload with BLAKE3, and signs with
 * its ML-DSA identity. Agreement is hash-equality, not vote-counting. A
 * node that is down is omitted; if fewer than `threshold` matching hashes
 * remain, consensus_reached is false. This function never invents a digest.
 */

import { VeyaSdkError } from "../errors/veya-error.js";
import { warn, info } from "../observability/log.js";

export type NodeResult = {
  node_id: string;
  blake3_execution_hash: string;
  mldsa_signature: string;
  mldsa_public_key_hex?: string;
  status: "success" | "fail";
  error?: string;
};

export type ConsensusResult = {
  task_id: string;
  agreed_blake3_hash: string | null;
  node_results: NodeResult[];
  consensus_reached: boolean;
  threshold: number;
  reachable: number;
};

const DEFAULT_THRESHOLD = 2;

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function runConsensus(
  nodeUrls: string[],
  taskId: string,
  payload: object,
  options?: { timeoutMs?: number; threshold?: number },
): Promise<ConsensusResult> {
  if (!taskId.trim()) {
    throw new VeyaSdkError("INVALID_CONFIG", "taskId is required for consensus");
  }
  if (!Array.isArray(nodeUrls) || nodeUrls.length === 0) {
    throw new VeyaSdkError("CONSENSUS_UNREACHABLE", "no validator URLs configured");
  }

  const timeoutMs = options?.timeoutMs ?? 15_000;
  const threshold = options?.threshold ?? DEFAULT_THRESHOLD;
  const results: NodeResult[] = [];

  for (const base of nodeUrls) {
    const url = `${base.trim().replace(/\/$/, "")}/execute`;
    try {
      const res = await fetchWithTimeout(
        url,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ task_id: taskId, payload }),
        },
        timeoutMs,
      );
      if (!res.ok) {
        warn("consensus", "validator HTTP error", { url, status: res.status });
        results.push({
          node_id: base,
          blake3_execution_hash: "",
          mldsa_signature: "",
          status: "fail",
          error: `http ${res.status}`,
        });
        continue;
      }
      const body = (await res.json()) as { result?: NodeResult };
      if (body.result) results.push(body.result);
      else {
        results.push({
          node_id: base,
          blake3_execution_hash: "",
          mldsa_signature: "",
          status: "fail",
          error: "missing result",
        });
      }
    } catch (err) {
      warn("consensus", "validator unreachable", {
        url,
        cause: err instanceof Error ? err.message : String(err),
      });
      results.push({
        node_id: base,
        blake3_execution_hash: "",
        mldsa_signature: "",
        status: "fail",
        error: err instanceof Error ? err.message : "unreachable",
      });
    }
  }

  const hashCounts = new Map<string, number>();
  for (const r of results) {
    if (r.status === "success" && r.blake3_execution_hash) {
      hashCounts.set(r.blake3_execution_hash, (hashCounts.get(r.blake3_execution_hash) ?? 0) + 1);
    }
  }
  let agreed: string | null = null;
  let max = 0;
  for (const [h, c] of hashCounts) {
    if (c > max) {
      max = c;
      agreed = h;
    }
  }

  const reachable = results.filter((r) => r.status === "success").length;
  const consensus_reached = max >= threshold && reachable >= threshold;

  info("consensus", "quorum evaluated", {
    taskId,
    reachable,
    threshold,
    consensus_reached,
    agreed,
  });

  return {
    task_id: taskId,
    agreed_blake3_hash: consensus_reached ? agreed : null,
    node_results: results,
    consensus_reached,
    threshold,
    reachable,
  };
}
