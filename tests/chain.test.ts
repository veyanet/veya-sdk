import { describe, expect, it } from "vitest";
import { INSTRUCTION_NAMES, VEYA_WRITE_SIGNATURES } from "../src/program/instructions.js";
import { resolveConfig } from "../src/config.js";
import { EvmAnchor } from "../src/client/evm.js";
import {
  MAINNET_GAS_CEILING,
  MAINNET_MAX_FEE_WEI,
  ROBINHOOD_MAINNET,
  ROBINHOOD_MAINNET_CHAIN_ID,
  ROBINHOOD_TESTNET,
  ROBINHOOD_TESTNET_CHAIN_ID,
  assertMainnetFee,
  explorerTxUrl,
  isRobinhoodMainnet,
  isRobinhoodTestnet,
  walletAddChainParams,
} from "../src/chain.js";
import { VEYA_ABI, VEYA_CONTRACT_ADDRESS, abiFunctionNames } from "../src/abi/index.js";
import { VeyaSdkError, fromAnchorRevert, NO_TESTNET_TOKENS } from "../src/errors/veya-error.js";

function restoreEnv(name: string, previous: string | undefined): void {
  if (previous === undefined) delete process.env[name];
  else process.env[name] = previous;
}

describe("Robinhood Chain defaults", () => {
  it("pins testnet chain id 46630 and Veya.sol", () => {
    expect(ROBINHOOD_TESTNET.chainId).toBe(46630);
    expect(ROBINHOOD_TESTNET_CHAIN_ID).toBe(46630);
    expect(ROBINHOOD_TESTNET.rpcUrl).toContain("robinhood.com");
    expect(ROBINHOOD_TESTNET.explorerUrl).toContain("explorer.testnet.chain.robinhood.com");
    expect(ROBINHOOD_TESTNET.faucetUrl).toBe("https://faucet.testnet.chain.robinhood.com/");
    expect(ROBINHOOD_TESTNET.contractAddress).toBe("0x1a1Dc3c55550FCE9F70ef6cDEeF967c0b72a5d84");
    expect(VEYA_CONTRACT_ADDRESS).toBe(ROBINHOOD_TESTNET.contractAddress);
    expect(isRobinhoodTestnet(46630)).toBe(true);
    expect(isRobinhoodTestnet(1)).toBe(false);
  });

  it("resolveConfig defaults to Robinhood mainnet", () => {
    const prev = process.env.ROBINHOOD_NETWORK;
    const prevContract = process.env.VEYA_MAINNET_CONTRACT_ADDRESS;
    const prevKey = process.env.VEYA_MAINNET_RELAYER_PRIVATE_KEY;
    delete process.env.ROBINHOOD_NETWORK;
    delete process.env.VEYA_MAINNET_CONTRACT_ADDRESS;
    delete process.env.VEYA_MAINNET_RELAYER_PRIVATE_KEY;
    try {
      const cfg = resolveConfig({});
      expect(cfg.network).toBe("mainnet");
      expect(cfg.chainId).toBe(4663);
      expect(cfg.rpcUrl).toBe(ROBINHOOD_MAINNET.rpcUrl);
      expect(cfg.contractAddress).toBe(ROBINHOOD_MAINNET.contractAddress);
      expect(cfg.explorerUrl).toBe(ROBINHOOD_MAINNET.explorerUrl);
      expect(cfg.sealedNodeUrl).toBe("http://127.0.0.1:7800");
      expect(cfg.validatorNodes).toHaveLength(3);
      expect(cfg.payerPrivateKey).toBeUndefined();
    } finally {
      restoreEnv("ROBINHOOD_NETWORK", prev);
      restoreEnv("VEYA_MAINNET_CONTRACT_ADDRESS", prevContract);
      restoreEnv("VEYA_MAINNET_RELAYER_PRIVATE_KEY", prevKey);
    }
  });

  it("ROBINHOOD_NETWORK=testnet keeps the previous testnet profile", () => {
    const prev = process.env.ROBINHOOD_NETWORK;
    process.env.ROBINHOOD_NETWORK = "testnet";
    try {
      const cfg = resolveConfig({});
      expect(cfg.network).toBe("testnet");
      expect(cfg.chainId).toBe(46630);
      expect(cfg.contractAddress).toBe(ROBINHOOD_TESTNET.contractAddress);
    } finally {
      restoreEnv("ROBINHOOD_NETWORK", prev);
    }
  });

  it("mainnet profile pins the deployed contract and ignores the testnet payer slot", () => {
    const prevContract = process.env.VEYA_MAINNET_CONTRACT_ADDRESS;
    const prevMainnetKey = process.env.VEYA_MAINNET_RELAYER_PRIVATE_KEY;
    const prevDeployer = process.env.VEYA_DEPLOYER_PRIVATE_KEY;
    delete process.env.VEYA_MAINNET_CONTRACT_ADDRESS;
    delete process.env.VEYA_MAINNET_RELAYER_PRIVATE_KEY;
    process.env.VEYA_DEPLOYER_PRIVATE_KEY = "0x" + "ab".repeat(32);
    try {
      const cfg = resolveConfig({ network: "mainnet" });
      expect(cfg.network).toBe("mainnet");
      expect(cfg.chainId).toBe(4663);
      expect(ROBINHOOD_MAINNET_CHAIN_ID).toBe(4663);
      expect(ROBINHOOD_MAINNET.chainIdHex).toBe("0x1237");
      expect(cfg.rpcUrl).toBe("https://rpc.mainnet.chain.robinhood.com");
      expect(cfg.explorerUrl).toBe("https://robinhoodchain.blockscout.com");
      expect(cfg.contractAddress).toBe(ROBINHOOD_MAINNET.contractAddress);
      expect(cfg.payerPrivateKey).toBeUndefined();
      expect(isRobinhoodMainnet(4663)).toBe(true);
      expect(isRobinhoodTestnet(4663)).toBe(false);
    } finally {
      restoreEnv("VEYA_MAINNET_CONTRACT_ADDRESS", prevContract);
      restoreEnv("VEYA_MAINNET_RELAYER_PRIVATE_KEY", prevMainnetKey);
      restoreEnv("VEYA_DEPLOYER_PRIVATE_KEY", prevDeployer);
    }
  });

  it("mainnet payer is VEYA_MAINNET_RELAYER_PRIVATE_KEY only", () => {
    const prev = process.env.VEYA_MAINNET_RELAYER_PRIVATE_KEY;
    const mainnetKey = "0x" + "cd".repeat(32);
    process.env.VEYA_MAINNET_RELAYER_PRIVATE_KEY = mainnetKey;
    try {
      const cfg = resolveConfig({ network: "mainnet" });
      expect(cfg.payerPrivateKey).toBe(mainnetKey);
    } finally {
      restoreEnv("VEYA_MAINNET_RELAYER_PRIVATE_KEY", prev);
    }
  });

  it("fee above 0.01 ETH at the 300,000 gas ceiling is FEE_CAP", () => {
    expect(MAINNET_MAX_FEE_WEI).toBe(10n ** 16n);
    expect(MAINNET_GAS_CEILING).toBe(300_000);
    expect(() => assertMainnetFee(1n)).not.toThrow();
    try {
      assertMainnetFee(MAINNET_MAX_FEE_WEI);
      throw new Error("expected FEE_CAP");
    } catch (err) {
      expect(err).toBeInstanceOf(VeyaSdkError);
      expect((err as VeyaSdkError).code).toBe("FEE_CAP");
    }
  });

  it("an empty mainnet contract constructs no anchor and sends nothing", () => {
    const prev = process.env.VEYA_MAINNET_CONTRACT_ADDRESS;
    delete process.env.VEYA_MAINNET_CONTRACT_ADDRESS;
    try {
      expect(
        () =>
          new EvmAnchor({
            network: "mainnet",
            contractAddress: "",
            payerPrivateKey: "0x" + "11".repeat(32),
          }),
      ).toThrow(VeyaSdkError);
      try {
        new EvmAnchor({
          network: "mainnet",
          contractAddress: "",
          payerPrivateKey: "0x" + "11".repeat(32),
        });
      } catch (err) {
        expect((err as VeyaSdkError).code).toBe("MAINNET_UNPUBLISHED");
      }
    } finally {
      restoreEnv("VEYA_MAINNET_CONTRACT_ADDRESS", prev);
    }
  });

  it("builds explorer URLs on the default (Mainnet) profile and on Testnet when asked", () => {
    const hash = "0x4314faefee6f1c635f91dd075384d4816e10abd84b9bb88e3328b51e630e395d";
    expect(explorerTxUrl(hash)).toBe(`${ROBINHOOD_MAINNET.explorerUrl}/tx/${hash}`);
    expect(explorerTxUrl(hash, ROBINHOOD_TESTNET.explorerUrl)).toBe(
      `https://explorer.testnet.chain.robinhood.com/tx/${hash}`,
    );
    expect(() => explorerTxUrl("0x1234")).toThrow(VeyaSdkError);
  });

  it("maps unfunded payer errors to the exact tokens sentence", () => {
    expect(fromAnchorRevert(new Error("insufficient funds for gas")).message).toBe(NO_TESTNET_TOKENS);
    expect(fromAnchorRevert(new Error("insufficient funds for gas")).code).toBe("UNFUNDED_PAYER");
  });

  it("wallet_addEthereumChain defaults to Mainnet", () => {
    expect(walletAddChainParams().chainId).toBe(ROBINHOOD_MAINNET.chainIdHex);
    expect(walletAddChainParams().rpcUrls[0]).toBe(ROBINHOOD_MAINNET.rpcUrl);
  });

  it("wallet_addEthereumChain matches testnet when asked", () => {
    const params = walletAddChainParams(ROBINHOOD_TESTNET);
    expect(params.chainId).toBe("0xb626");
    expect(params.chainId).toBe(`0x${(46630).toString(16)}`);
    expect(params.rpcUrls[0]).toBe(ROBINHOOD_TESTNET.rpcUrl);
  });

  it("ABI includes Veya.sol camelCase write functions", () => {
    const names = new Set(abiFunctionNames());
    for (const fn of INSTRUCTION_NAMES) {
      expect(names.has(fn), `missing ${fn}`).toBe(true);
      expect(VEYA_WRITE_SIGNATURES[fn]).toContain(fn);
    }
    expect(INSTRUCTION_NAMES).not.toContain("register_environment");
    expect(names.has("storeCommitment")).toBe(true);
  });
});
