import type { SealedExecResult, SealedPayload } from "./types.js";
import { VeyaSdkError } from "../errors/veya-error.js";
import { warn } from "../observability/log.js";

export type { SealedExecResult, SealedPayload };

function isSealedExecResult(body: unknown): body is SealedExecResult {
  if (!body || typeof body !== "object") return false;
  const r = body as SealedExecResult;
  return (
    typeof r.output_blake3_hash === "string" &&
    typeof r.mldsa_signature === "string" &&
    typeof r.verified === "boolean" &&
    !!r.sealed &&
    typeof r.sealed.blake3_commitment === "string"
  );
}

function normalizeSealedResponse(body: Record<string, unknown>): SealedExecResult {
  if (body.result && typeof body.result === "object" && isSealedExecResult(body.result)) {
    return body.result;
  }
  if (isSealedExecResult(body)) return body;

  // Legacy flat node response (deprecated — current sealed-node wraps under `result`)
  if (typeof body.blake3_execution_hash === "string") {
    return {
      output_blake3_hash: body.blake3_execution_hash,
      mldsa_signature: typeof body.mldsa_signature === "string" ? body.mldsa_signature : "",
      verified: body.status === "success",
      sealed: {
        ciphertext: [],
        blake3_commitment: "",
        context_label: "",
      },
    };
  }
  throw new VeyaSdkError("SEALED_REJECTED", "sealed-node returned an unrecognized body", {
    keys: Object.keys(body),
  });
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Call the Rust sealed-node `/protected` handler.
 *
 * Fail-closed: unreachable node, non-2xx, or malformed body throws.
 * Callers (and the hosted API) must not invent `protected: true`.
 */
export async function protectedExec(
  sealedNodeUrl: string,
  params: {
    environmentId: string;
    agentId: string;
    eventType: string;
    payload: object;
    sessionEntropy: Uint8Array;
  },
  options?: { timeoutMs?: number },
): Promise<SealedExecResult> {
  if (!sealedNodeUrl) {
    throw new VeyaSdkError("SEALED_UNREACHABLE", "sealedNodeUrl is empty");
  }
  if (!params.environmentId || !params.agentId) {
    throw new VeyaSdkError("INVALID_CONFIG", "environmentId and agentId are required");
  }
  if (!(params.sessionEntropy instanceof Uint8Array) || params.sessionEntropy.length < 16) {
    throw new VeyaSdkError("INVALID_CONFIG", "sessionEntropy must be at least 16 bytes");
  }

  const url = `${sealedNodeUrl.replace(/\/$/, "")}/protected`;
  const timeoutMs = options?.timeoutMs ?? 15_000;

  let res: Response;
  try {
    res = await fetchWithTimeout(
      url,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          environment_id: params.environmentId,
          agent_id: params.agentId,
          event_type: params.eventType,
          payload_json: JSON.stringify(params.payload),
          session_entropy_hex: Buffer.from(params.sessionEntropy).toString("hex"),
        }),
      },
      timeoutMs,
    );
  } catch (err) {
    warn("sealed", "sealed-node unreachable", {
      url,
      cause: err instanceof Error ? err.message : String(err),
    });
    throw new VeyaSdkError("SEALED_UNREACHABLE", "sealed-node did not respond", {
      url,
      cause: err instanceof Error ? err.message : String(err),
    });
  }

  if (!res.ok) {
    throw new VeyaSdkError("SEALED_REJECTED", `sealed-node error: ${res.status}`, {
      url,
      status: res.status,
    });
  }

  const body = (await res.json()) as Record<string, unknown>;
  return normalizeSealedResponse(body);
}
