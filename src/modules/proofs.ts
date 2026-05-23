import type { HttpClient } from "../client/http.js";
import type { ProofAnchor, VerifyProofResult } from "../types/index.js";
import { sha256Hex } from "../utils/hash.js";

export type AnchorContentInput = {
  label: string;
  content: string;
};

export type AnchorContentResult = {
  proof: ProofAnchor;
  explorerUrl: string;
  contentHash: string;
};

export type AccountProofItem = {
  id: string;
  kind: "content" | "agent";
  label: string;
  contentHash: string | null;
  attestationTx: string;
  attestationUri: string | null;
  createdAt: string;
  explorerUrl: string;
  environmentName?: string;
  protected?: boolean;
};

export class ProofsResource {
  constructor(private readonly http: HttpClient) {}

  /**
   * Anchor UTF-8 content on Solana via the VEYA API (SHA-256 → onchain memo).
   *
   * ```bash
   * curl -X POST "$VEYA_API_URL/v1/proofs/anchor" \
   *   -H "Authorization: Bearer $VEYA_TOKEN" \
   *   -H "Content-Type: application/json" \
   *   -d '{"label":"Board vote","content":"Proposal 42 passed."}'
   * ```
   */
  async anchorContent(input: AnchorContentInput): Promise<AnchorContentResult> {
    return this.http.request<AnchorContentResult>("/v1/proofs/anchor", {
      method: "POST",
      body: input,
    });
  }

  async anchorText(label: string, content: string): Promise<AnchorContentResult> {
    const contentHash = await sha256Hex(content);
    const result = await this.anchorContent({ label, content });
    return { ...result, contentHash };
  }

  async list(): Promise<{ anchors: AccountProofItem[]; agentProofs: AccountProofItem[] }> {
    return this.http.request("/v1/proofs");
  }

  /**
   * Public verification — no API key required.
   *
   * ```bash
   * curl "$VEYA_API_URL/api/verify/<TRANSACTION_SIGNATURE>"
   * ```
   */
  async verifyTransaction(signature: string): Promise<VerifyProofResult> {
    const trimmed = signature.trim();
    return this.http.request<VerifyProofResult>(
      `/api/verify/${encodeURIComponent(trimmed)}`,
      { auth: false }
    );
  }
}
