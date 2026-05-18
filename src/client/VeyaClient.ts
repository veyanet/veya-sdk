import { resolveConfig, type VeyaConfig } from "../config.js";
import { HttpClient } from "./http.js";
import { walletAuth, type WalletAuthInput } from "../auth/wallet.js";
import { EnvironmentsResource } from "../modules/environments.js";
import { AgentsResource } from "../modules/agents.js";
import { MemoryResource } from "../modules/memory.js";
import { ExecutionsResource } from "../modules/executions.js";
import { ProofsResource } from "../modules/proofs.js";
import { ApiKeysResource } from "../modules/apiKeys.js";
import { SolanaResource } from "../modules/solana.js";
import { ProtectionResource } from "../modules/protection.js";
import { DecentralizedComputeResource } from "../modules/compute.js";

/**
 * Entry point for the VEYA HTTP API.
 *
 * ```bash
 * npm install @veya/sdk
 * ```
 *
 * ```ts
 * import { Veya } from "@veya/sdk";
 * const veya = new Veya({ apiUrl: process.env.VEYA_API_URL, apiKey: process.env.VEYA_API_KEY });
 * const envs = await veya.environments.list();
 * ```
 */
export class Veya {
  readonly config: VeyaConfig;
  private readonly http: HttpClient;

  readonly environments: EnvironmentsResource;
  readonly agents: AgentsResource;
  readonly memory: MemoryResource;
  readonly executions: ExecutionsResource;
  readonly proofs: ProofsResource;
  readonly apiKeys: ApiKeysResource;
  readonly solana: SolanaResource;
  readonly protection: ProtectionResource;
  readonly compute: DecentralizedComputeResource;

  constructor(options: Partial<VeyaConfig> = {}) {
    this.config = resolveConfig(options);
    this.http = new HttpClient(this.config);
    this.environments = new EnvironmentsResource(this.http);
    this.agents = new AgentsResource(this.http);
    this.memory = new MemoryResource(this.http);
    this.executions = new ExecutionsResource(this.http);
    this.proofs = new ProofsResource(this.http);
    this.apiKeys = new ApiKeysResource(this.http);
    this.solana = new SolanaResource(this.http);
    this.protection = new ProtectionResource(this.http);
    this.compute = new DecentralizedComputeResource(this.http);
  }

  /** Wallet sign-in; sets JWT on this client for later calls. */
  async authWithWallet(input: WalletAuthInput) {
    return walletAuth(this.http, input);
  }

  setAccessToken(token: string): void {
    this.http.setAccessToken(token);
  }

  /** GET /health — no auth required. */
  async health() {
    return this.http.request<{
      status: string;
      database: string;
      solana: {
        cluster: string;
        anchor: { configured: boolean; relayerPubkey: string | null; ready: boolean };
      };
    }>("/health", { auth: false });
  }
}
