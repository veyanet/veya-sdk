import { describe, expect, it } from "vitest";
import { VeyaSdkError } from "../src/errors/veya-error.js";
import {
  SETTLEMENT,
  assertRealEthSpend,
  assertReceiptChain,
  guestUseOnMainnetAllowed,
  mainnetDeployAllowed,
  mainnetDeployPlan,
  mainnetFundingStatus,
  mainnetIncident,
  receiptExplorer,
  receiptNetwork,
} from "../src/settlement.js";

describe("settlement profile", () => {
  it("records the deployed Mainnet contract and keeps Guest Use closed", () => {
    expect(SETTLEMENT.chainChosen).toBe(true);
    expect(SETTLEMENT.chosenChainId).toBe(4663);
    expect(SETTLEMENT.settlementLive).toBe(true);
    expect(SETTLEMENT.contractAddress).toBe("0x87dC582eEA544A434a5C1e30Ca3d12c1e548a674");
    expect(SETTLEMENT.testnetContract).toBe("0x1a1Dc3c55550FCE9F70ef6cDEeF967c0b72a5d84");
    expect(SETTLEMENT.guestUseOnMainnet).toBe(false);
    expect(SETTLEMENT.publicHost).toBe("mainnet-4663");
  });

  it("does not broadcast a deploy", () => {
    expect(mainnetDeployAllowed({})).toBe(false);
    expect(
      mainnetDeployAllowed({
        VEYA_MAINNET_DEPLOY: "deploy-4663",
        VEYA_MAINNET_RELAYER_PRIVATE_KEY: "0x" + "11".repeat(32),
      }),
    ).toBe(true);
    expect(mainnetDeployPlan().broadcast).toBe(false);
    expect(mainnetDeployPlan().contractAddress).toBe("");
  });

  it("keeps a receipt on the chain that produced it", () => {
    expect(receiptNetwork(46630)).toBe("testnet");
    expect(receiptNetwork(4663)).toBe("mainnet");
    expect(receiptExplorer(46630, "0x" + "ab".repeat(32))).toContain("explorer.testnet.chain.robinhood.com");
    expect(receiptExplorer(4663, "0x" + "ab".repeat(32))).toContain("robinhoodchain.blockscout.com");
    expect(() => assertReceiptChain(46630, 4663)).toThrow(VeyaSdkError);
    try {
      assertReceiptChain(46630, 4663);
    } catch (err) {
      expect((err as VeyaSdkError).code).toBe("RECEIPT_CHAIN");
    }
  });

  it("reports mainnet funding without treating the testnet key as ready", () => {
    expect(mainnetFundingStatus({ keyConfigured: false, balanceWei: 1n }).ready).toBe(false);
    expect(mainnetFundingStatus({ keyConfigured: true, balanceWei: 0n }).reason).toBe(
      "mainnet host signer is unfunded",
    );
    expect(mainnetFundingStatus({ keyConfigured: true, balanceWei: 1n }).ready).toBe(true);
  });

  it("keeps guest Use off, including when the kill switch is cleared", () => {
    expect(guestUseOnMainnetAllowed({})).toBe(false);
    expect(guestUseOnMainnetAllowed({ VEYA_MAINNET_GUEST_KILL: "0" })).toBe(false);
  });

  it("caps real ETH at 0.01 and maps incidents to 402, 403, and 503", () => {
    expect(() => assertRealEthSpend(1n)).not.toThrow();
    expect(() => assertRealEthSpend(10n ** 16n + 1n)).toThrow(VeyaSdkError);
    expect(mainnetIncident("FEE_CAP").status).toBe(402);
    expect(mainnetIncident("GUEST_TESTNET_ONLY").status).toBe(403);
    expect(mainnetIncident("MAINNET_UNPUBLISHED", "0x" + "cd".repeat(32))).toMatchObject({
      status: 503,
      failClosed: true,
    });
  });
});