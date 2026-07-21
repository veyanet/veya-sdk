/**
 * Sealed execution exports.
 *
 * protectedExec talks to the Rust sealed-node. Types describe the JSON
 * the node returns. requireVerifiedSeal is the fail-closed gate used by
 * VeyaClient.protectedExecute so a 200 with verified=false cannot look
 * like a successful protected run.
 *
 * Default origin is http://127.0.0.1:7800 — the same value resolveConfig
 * uses when VEYA_SEALED_NODE_URL is unset. Operators who bind sealed-node
 * elsewhere must pass sealedNodeUrl explicitly.
 */

export { protectedExec } from "./protectedExec.js";
export type { SealedExecResult, SealedPayload, SealedExecRequest } from "./types.js";
export {
  isSealedPayload,
  requireVerifiedSeal,
  commitmentHex,
  defaultContextLabel,
  SEALED_CONTEXT_LABEL_PREFIX,
} from "./types.js";

export const DEFAULT_SEALED_NODE_URL = "http://127.0.0.1:7800";
export const SEALED_PROTECTED_PATH = "/protected";

export function sealedProtectedUrl(base: string = DEFAULT_SEALED_NODE_URL): string {
  return `${base.replace(/\/$/, "")}${SEALED_PROTECTED_PATH}`;
}

export function randomSessionEntropy(bytes = 32): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(bytes));
}

export type SealedHealthProbe = {
  url: string;
  ok: boolean;
  status?: number;
  error?: string;
};

export async function probeSealedNode(
  base: string = DEFAULT_SEALED_NODE_URL,
  timeoutMs = 5_000,
): Promise<SealedHealthProbe> {
  const url = `${base.replace(/\/$/, "")}/health`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    return { url, ok: res.ok, status: res.status };
  } catch (err) {
    return { url, ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
