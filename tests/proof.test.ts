import { describe, expect, it } from "vitest";
import { VeyaSdkError } from "../src/errors/veya-error.js";
import { canonicalJson, proveInput } from "../src/proof.js";
import { hashBlake3 } from "../src/pq/blake3.js";
import type { VeyaClient } from "../src/client/VeyaClient.js";

describe("canonical proof input", () => {
  it("hashes the same object to one digest when the key order changes", async () => {
    const left = canonicalJson({ b: 1, a: { d: true, c: "x" } });
    const right = canonicalJson({ a: { c: "x", d: true }, b: 1 });
    expect(left).toBe(right);
    expect(left).toBe('{"a":{"c":"x","d":true},"b":1}');
    const digestA = await hashBlake3(left);
    const digestB = await hashBlake3(right);
    expect(digestA).toBe(digestB);
    expect(digestA).toHaveLength(64);
  });

  it("returns the full proof when the receipt called another contract", async () => {
    const txHash = `0x${"ab".repeat(32)}`;
    const client = {
      config: {
        chainId: 46630,
        contractAddress: "0x1a1Dc3c55550FCE9F70ef6cDEeF967c0b72a5d84",
      },
      pingChain: async () => ({ chainId: 46630 }),
      explorerFor: (hash: string) => `https://explorer.testnet.chain.robinhood.com/tx/${hash}`,
      verifyTransaction: async () => {
        throw new VeyaSdkError(
          "CHAIN_MISMATCH",
          "transaction did not target Veya.sol — not a VEYA proof",
        );
      },
    };
    const proof = await proveInput(client as unknown as VeyaClient, { kind: "tx", txHash });
    expect(proof).toMatchObject({
      ok: false,
      mode: "refused",
      inputKind: "tx",
      digestHex: null,
      anchored: false,
      chainId: 46630,
      contractAddress: "0x1a1Dc3c55550FCE9F70ef6cDEeF967c0b72a5d84",
      txHash,
      explorerUrl: `https://explorer.testnet.chain.robinhood.com/tx/${txHash}`,
      event: null,
      blockNumber: null,
      refusal: "transaction did not target Veya.sol — not a VEYA proof",
    });
  });

  it("keeps array order", () => {
    expect(canonicalJson(["b", "a"])).toBe('["b","a"]');
    expect(canonicalJson(["b", "a"])).not.toBe(canonicalJson(["a", "b"]));
  });
});
