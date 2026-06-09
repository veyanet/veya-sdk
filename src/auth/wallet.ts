/**
 * Handles wallet challenge-response signature logic.
 */
import bs58 from "bs58";
import type { HttpClient } from "../client/http.js";

export type WalletSignMessage = (message: Uint8Array) => Promise<Uint8Array>;

export type WalletAuthInput = {
  wallet: string;
  signMessage: WalletSignMessage;
};

export type WalletAuthResult = {
  token: string;
  wallet: string;
  tokenType: string;
  expiresIn: string;
};

/**
 * Wallet authentication against the VEYA API.
 *
 * ```bash
 * # 1. GET  /auth/nonce?wallet=<PUBKEY>
 * # 2. Sign message with Phantom / hardware wallet
 * # 3. POST /auth/verify { wallet, message, signature }
 * ```
 *
 * ```ts
 * import { Veya } from "@veya/sdk";
 * const veya = new Veya({ apiUrl: "https://api.veyanet.tech" });
 * await veya.authWithWallet({
 *   wallet: pubkey,
 *   signMessage: (msg) => wallet.signMessage(msg),
 * });
 * ```
 */
export async function walletAuth(
  http: HttpClient,
  input: WalletAuthInput
): Promise<WalletAuthResult> {
  if (!input.wallet || input.wallet.length < 32) {
    throw new Error("wallet must be a valid Solana public key (base58)");
  }
  if (typeof input.signMessage !== "function") {
    throw new Error("signMessage callback is required");
  }

  const { message } = await http.request<{ message: string }>(
    `/auth/nonce?wallet=${encodeURIComponent(input.wallet)}`,
    { auth: false }
  );

  if (!message || message.length < 8) {
    throw new Error("Invalid nonce response from API");
  }

  const messageBytes = new TextEncoder().encode(message);
  const signatureBytes = await input.signMessage(messageBytes);
  const signature = bs58.encode(signatureBytes);

  const result = await http.request<WalletAuthResult>("/auth/verify", {
    method: "POST",
    auth: false,
    body: { wallet: input.wallet, message, signature },
  });

  if (!result.token) {
    throw new Error("Verify response did not include a token");
  }

  http.setAccessToken(result.token);
  return result;
}
