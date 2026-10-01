/**
 * Settlement profile for Veya.sol.
 * Mainnet is the default. Testnet is selected with network "testnet"
 * or ROBINHOOD_NETWORK=testnet. Guest Use on Mainnet stays closed.
 * mainnetDeployPlan() does not broadcast.
 */

import { MAINNET_MAX_FEE_WEI, ROBINHOOD_MAINNET_CHAIN_ID, ROBINHOOD_TESTNET_CHAIN_ID } from "./chain.js";
import { VeyaSdkError } from "./errors/veya-error.js";

export const SETTLEMENT = {
  chosenChainId: ROBINHOOD_MAINNET_CHAIN_ID,
  chainChosen: true,
  settlementLive: true,
  contractAddress: "0x87dC582eEA544A434a5C1e30Ca3d12c1e548a674",
  testnetContract: "0x1a1Dc3c55550FCE9F70ef6cDEeF967c0b72a5d84",
  guestUseOnMainnet: false,
  guestBuildStatus: 403,
  publicHost: "mainnet-4663",
  statement:
    "Default settlement is Mainnet and Veya.sol at 0x87dC582eEA544A434a5C1e30Ca3d12c1e548a674. network \"testnet\" or ROBINHOOD_NETWORK=testnet keeps Testnet.",
} as const;

/** Earlier name for SETTLEMENT. Same object. */
export const PHASE3_DECISION = SETTLEMENT;

/** Confirm phrase that would be required before any future broadcast. Broadcast is not implemented. */
export const MAINNET_DEPLOY_CONFIRM = "deploy-4663";

export type ReceiptNetwork = "testnet" | "mainnet" | "other";

export function receiptNetwork(chainId: number): ReceiptNetwork {
  if (chainId === ROBINHOOD_TESTNET_CHAIN_ID) return "testnet";
  if (chainId === ROBINHOOD_MAINNET_CHAIN_ID) return "mainnet";
  return "other";
}

export function receiptExplorer(chainId: number, txHash: string): string {
  const base =
    receiptNetwork(chainId) === "mainnet"
      ? "https://robinhoodchain.blockscout.com"
      : "https://explorer.testnet.chain.robinhood.com";
  return `${base.replace(/\/$/, "")}/tx/${txHash}`;
}

/** Keep the receipt on the profile that produced it. Do not relabel it. */
export function assertReceiptChain(proofChainId: number, activeChainId: number): void {
  if (proofChainId !== activeChainId) {
    throw new VeyaSdkError(
      "RECEIPT_CHAIN",
      `Receipt is on chain ${proofChainId}. The active profile is ${activeChainId}. Nothing was relabeled.`,
      { proofChainId, activeChainId, proofNetwork: receiptNetwork(proofChainId) },
    );
  }
}

export function mainnetDeployAllowed(env: NodeJS.ProcessEnv = process.env): boolean {
  return (
    env.VEYA_MAINNET_DEPLOY === MAINNET_DEPLOY_CONFIRM &&
    Boolean(env.VEYA_MAINNET_RELAYER_PRIVATE_KEY?.trim()) &&
    !env.VEYA_MAINNET_CONTRACT_ADDRESS?.trim()
  );
}

export function mainnetDeployPlan(): {
  chainId: number;
  contractAddress: "";
  broadcast: false;
  settlementLive: false;
} {
  return {
    chainId: SETTLEMENT.chosenChainId,
    contractAddress: "",
    broadcast: false,
    settlementLive: false,
  };
}

export function mainnetFundingStatus(input: {
  keyConfigured: boolean;
  balanceWei: bigint | null;
}): { separateFromTestnet: true; ready: boolean; reason: string } {
  if (!input.keyConfigured) {
    return {
      separateFromTestnet: true,
      ready: false,
      reason: "VEYA_MAINNET_RELAYER_PRIVATE_KEY is unset",
    };
  }
  if (input.balanceWei === null) {
    return { separateFromTestnet: true, ready: false, reason: "balance was not read" };
  }
  if (input.balanceWei <= 0n) {
    return { separateFromTestnet: true, ready: false, reason: "mainnet relayer is unfunded" };
  }
  return { separateFromTestnet: true, ready: true, reason: "mainnet relayer holds ETH" };
}

/** Default halted. The written guest decision is also no, so clearing the kill switch does not open Use. */
export function guestUseOnMainnetAllowed(env: NodeJS.ProcessEnv = process.env): boolean {
  const killed = (env.VEYA_MAINNET_GUEST_KILL ?? "1") !== "0";
  if (killed) return false;
  return SETTLEMENT.guestUseOnMainnet;
}

export function assertRealEthSpend(amountWei: bigint): void {
  if (amountWei > MAINNET_MAX_FEE_WEI) {
    throw new VeyaSdkError("FEE_CAP", "Real-ETH spend would exceed 0.01 ETH. Nothing was sent.", {
      amountWei: amountWei.toString(),
      maxFeeWei: MAINNET_MAX_FEE_WEI.toString(),
    });
  }
}

export type MainnetIncident = {
  status: 402 | 403 | 503;
  code: string;
  failClosed: true;
  explorerUrl: string | null;
};

export function mainnetIncident(code: string, txHash?: string): MainnetIncident {
  const status: MainnetIncident["status"] =
    code === "FEE_CAP" || code === "SPENDING_LIMIT" ? 402 : code === "GUEST_TESTNET_ONLY" ? 403 : 503;
  return {
    status,
    code,
    failClosed: true,
    explorerUrl: txHash ? receiptExplorer(ROBINHOOD_MAINNET_CHAIN_ID, txHash) : null,
  };
}
