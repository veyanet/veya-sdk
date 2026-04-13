export interface Execution {
  id: string;
  environmentId: string;
  agentId?: string | null;
  eventType: string;
  payload: Record<string, unknown>;
  protected: boolean;
  spendLamports: string;
  commitmentHash?: string | null;
  attestationTx?: string | null;
  attestationUri?: string | null;
  createdAt: string;
}

export interface MemoryEntry {
  id: string;
  environmentId: string;
  agentId?: string | null;
  scope: string;
  contentHash: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface ApiKeyRow {
  id: string;
  name: string;
  tier: string;
  prefix: string;
  environmentId?: string | null;
  createdAt: string;
}

export interface ProofAnchor {
  id: string;
  label: string;
  contentHash: string;
  contentBytes: number;
  attestationTx: string;
  attestationUri: string;
  cluster: string;
  createdAt: string;
}

export interface VerifyProofResult {
  valid: boolean;
  signature: string;
  hash: string;
  uri: string;
  slot: number | null;
  blockTime: number | null;
  cluster: string;
  explorerUrl: string;
  registered: { label: string; contentHash: string; createdAt: string } | null;
}
