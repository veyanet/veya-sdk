import { describe, expect, it } from "vitest";
import { INSTRUCTION_NAMES, VEYA_WRITE_SIGNATURES } from "./program/instructions.js";
import { resolveConfig } from "./config.js";
import {
  ROBINHOOD_TESTNET,
  ROBINHOOD_TESTNET_CHAIN_ID,
  explorerTxUrl,
  isRobinhoodTestnet,
  walletAddChainParams,
} from "./chain.js";
import { VEYA_ABI, VEYA_CONTRACT_ADDRESS, abiFunctionNames } from "./abi/index.js";
import { VeyaSdkError } from "./errors/veya-error.js";

describe("Robinhood Chain defaults", () => {
  it("pins testnet chain id 46630 and Veya.sol", () => {
    expect(ROBINHOOD_TESTNET.chainId).toBe(46630);
    expect(ROBINHOOD_TESTNET_CHAIN_ID).toBe(46630);
    expect(ROBINHOOD_TESTNET.rpcUrl).toContain("robinhood.com");
    expect(ROBINHOOD_TESTNET.explorerUrl).toContain("explorer.testnet.chain.robinhood.com");
    expect(ROBINHOOD_TESTNET.contractAddress).toBe("0x1a1Dc3c55550FCE9F70ef6cDEeF967c0b72a5d84");
    expect(VEYA_CONTRACT_ADDRESS).toBe(ROBINHOOD_TESTNET.contractAddress);
    expect(isRobinhoodTestnet(46630)).toBe(true);
    expect(isRobinhoodTestnet(1)).toBe(false);
  });

  it("resolveConfig defaults to Robinhood testnet", () => {
    const cfg = resolveConfig({});
    expect(cfg.chainId).toBe(46630);
    expect(cfg.rpcUrl).toBe(ROBINHOOD_TESTNET.rpcUrl);
    expect(cfg.contractAddress).toBe(ROBINHOOD_TESTNET.contractAddress);
    expect(cfg.explorerUrl).toBe(ROBINHOOD_TESTNET.explorerUrl);
    expect(cfg.sealedNodeUrl).toBe("http://127.0.0.1:7800");
    expect(cfg.validatorNodes).toHaveLength(3);
    expect(cfg.payerPrivateKey).toBeUndefined();
  });

  it("builds explorer URLs for Robinhood testnet", () => {
    const hash = "0x4314faefee6f1c635f91dd075384d4816e10abd84b9bb88e3328b51e630e395d";
    expect(explorerTxUrl(hash)).toBe(
      `https://explorer.testnet.chain.robinhood.com/tx/${hash}`,
    );
    expect(() => explorerTxUrl("0x1234")).toThrow(VeyaSdkError);
  });

  it("wallet_addEthereumChain matches testnet", () => {
    const params = walletAddChainParams();
    expect(params.chainId).toBe("0xb636");
    expect(params.rpcUrls[0]).toBe(ROBINHOOD_TESTNET.rpcUrl);
  });

  it("ABI includes Veya.sol write functions (camelCase, not Solana snake_case)", () => {
    const names = new Set(abiFunctionNames());
    for (const fn of INSTRUCTION_NAMES) {
      expect(names.has(fn), `missing ${fn}`).toBe(true);
      expect(VEYA_WRITE_SIGNATURES[fn]).toContain(fn);
    }
    expect(INSTRUCTION_NAMES).not.toContain("register_environment");
    expect(names.has("storeCommitment")).toBe(true);
  });
});
