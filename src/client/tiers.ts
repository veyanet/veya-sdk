/**
 * $VEYA account tiers over the VEYA API (https://api.veyanet.tech).
 *
 * The API reads your $VEYA balance on Robinhood Chain mainnet (the sign-in wallet plus up to 3 linked
 * wallets, summed) and sets the limits of every authenticated call from that tier: daily actions,
 * daily receipts, receipt history window and the per-minute API key rate. This module only reads
 * what the API reports; it never decides a tier or a limit itself.
 */

export const DEFAULT_API_URL = "https://api.veyanet.tech";

export type TierId = "base" | "holder" | "builder" | "core";

export interface TierLimits {
  /** Per-minute rate for the key that made the call (sessions show the dev key rate). */
  apiRatePerMinute: number;
  apiRatePerMinuteByKey: { dev: number; live: number };
  apiRatePerMinuteMultiplier: number;
  dailyActions: number;
  dailyReceipts: number;
  /** null means the full history. */
  receiptHistoryDays: number | null;
  feedShowcase: string;
}

export interface AccountTier {
  tier: { id: TierId; name: string; rank: number };
  /** Summed whole $VEYA across the counted wallets. */
  balance: number;
  /** chain = read now; last-known = an RPC failed, a recent read was used; unavailable = nothing could be read, Base applies. */
  source: "chain" | "last-known" | "unavailable" | "no-wallet" | "guest" | "disabled";
  checkedAt: string | null;
  wallets: string[];
  maxLinkedWallets: number;
  limits: TierLimits;
  /** Today's use (UTC day). */
  today: {
    day: string;
    actions: { used: number; limit: number };
    receipts: { used: number; limit: number };
    resetsAt: string;
  };
  dailyLimitsEnforced: boolean;
  tiersEnabled: boolean;
  nextTier: { id: TierId; name: string; minBalance: number } | null;
  note?: string | null;
  [k: string]: unknown;
}

export interface TierTableEntry {
  id: TierId;
  name: string;
  /** Whole $VEYA needed for this tier. */
  minBalance: number;
  limits: {
    apiRatePerMinuteMultiplier: number;
    dailyActions: number;
    dailyReceipts: number;
    /** null means the full history. */
    receiptHistoryDays: number | null;
  };
  feedShowcase: string;
  available?: boolean;
  [k: string]: unknown;
}

export interface TierTable {
  enabled: boolean;
  token: { symbol: string; chain: string };
  howItWorks?: string;
  utilityOnly?: string;
  tiers: TierTableEntry[];
  [k: string]: unknown;
}

export interface VeyaApiOptions {
  /** Defaults to https://api.veyanet.tech */
  baseUrl?: string;
  /** A VEYA API key (veya_dev_… / veya_live_…) or a session token from wallet sign-in. */
  apiKey?: string;
  fetch?: typeof fetch;
}

/** A non-2xx API answer. `code` is the API code (DAILY_LIMIT, RATE_LIMIT, WALLET_TAKEN, …). */
export class VeyaApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly retryAfterSeconds?: number;
  /** The tier the API named in a limit error, when it sent one. */
  readonly tier?: string;
  readonly body: Record<string, unknown>;
  constructor(status: number, body: Record<string, unknown>, retryAfterSeconds?: number) {
    super(typeof body.error === "string" ? body.error : `VEYA API answered ${status}`);
    this.name = "VeyaApiError";
    this.status = status;
    this.code = typeof body.code === "string" ? body.code : `HTTP_${status}`;
    this.retryAfterSeconds = retryAfterSeconds;
    this.tier = typeof body.tier === "string" ? body.tier : undefined;
    this.body = body;
  }
}

export interface MessageSigner {
  getAddress(): Promise<string>;
  signMessage(message: string): Promise<string>;
}

export class VeyaTiers {
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: VeyaApiOptions = {}) {
    this.baseUrl = (opts.baseUrl ?? DEFAULT_API_URL).replace(/\/+$/, "");
    this.apiKey = opts.apiKey;
    const f = opts.fetch ?? (globalThis as { fetch?: typeof fetch }).fetch;
    if (!f) throw new Error("No fetch available: pass opts.fetch");
    this.fetchImpl = f;
  }

  private async request<T>(path: string, init: { method?: string; body?: unknown; auth?: boolean } = {}): Promise<T> {
    const headers: Record<string, string> = { accept: "application/json" };
    if (init.body !== undefined) headers["content-type"] = "application/json";
    if (init.auth) {
      if (!this.apiKey) throw new Error("This call needs an API key or session token (apiKey option)");
      headers.authorization = `Bearer ${this.apiKey}`;
    }
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: init.method ?? "GET",
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
    const text = await res.text();
    let json: Record<string, unknown> = {};
    try {
      json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
    } catch {
      json = { error: text.slice(0, 200) };
    }
    if (!res.ok) {
      const ra = Number(res.headers.get("retry-after"));
      throw new VeyaApiError(res.status, json, Number.isFinite(ra) && ra > 0 ? ra : undefined);
    }
    return json as T;
  }

  /** The tier table: thresholds and limits per tier. No key needed. */
  getTierTable(): Promise<TierTable> {
    return this.request("/public/holder-tiers");
  }

  /** Your tier, the limits that apply to your calls, and what you used today (UTC). */
  getTier(): Promise<AccountTier> {
    return this.request("/v1/holder/tier", { auth: true });
  }

  /** Step 1 of linking a wallet: the exact message that wallet must sign (valid 10 minutes). */
  requestWalletLink(wallet: string): Promise<{ wallet: string; nonce: string; message: string; expiresAt: string }> {
    return this.request("/v1/holder/link/nonce", { method: "POST", body: { wallet }, auth: true });
  }

  /** Step 2: send the signature. The wallet's $VEYA then counts toward your tier (up to 3 linked wallets). */
  linkWallet(input: { wallet: string; message: string; signature: string }): Promise<Record<string, unknown>> {
    return this.request("/v1/holder/link", { method: "POST", body: input, auth: true });
  }

  /** Links a wallet in one step with any signer that has getAddress and signMessage (ethers Wallet, etc.). */
  async linkWalletWithSigner(signer: MessageSigner): Promise<Record<string, unknown>> {
    const wallet = await signer.getAddress();
    const { message } = await this.requestWalletLink(wallet);
    return this.linkWallet({ wallet, message, signature: await signer.signMessage(message) });
  }

  unlinkWallet(wallet: string): Promise<Record<string, unknown>> {
    return this.request(`/v1/holder/link/${encodeURIComponent(wallet)}`, { method: "DELETE", auth: true });
  }
}

/** Shortcut: your tier with one call. */
export function getTier(opts: VeyaApiOptions & { apiKey: string }): Promise<AccountTier> {
  return new VeyaTiers(opts).getTier();
}

/** Shortcut: the public tier table. */
export function getTierTable(opts: VeyaApiOptions = {}): Promise<TierTable> {
  return new VeyaTiers(opts).getTierTable();
}
