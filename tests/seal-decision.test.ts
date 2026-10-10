import { describe, expect, it } from "vitest";
import { VeyaSdkError } from "../src/errors/veya-error.js";
import { resolveSealPayer, sealDecision, type SealDecisionRunners } from "../src/sealDecision.js";
import type { ConsensusResult } from "../src/compute/consensus.js";
import type { SealedExecResult } from "../src/sealed/types.js";

const sealedOk: SealedExecResult = {
  output_blake3_hash: "ab".repeat(32),
  mldsa_signature: "cd",
  verified: true,
  sealed: { ciphertext: [], blake3_commitment: "ab".repeat(32), context_label: "veya.sealed.decision" },
};

function quorum(): ConsensusResult {
  const hash = "ef".repeat(32);
  return {
    task_id: "evidence-1",
    agreed_blake3_hash: hash,
    consensus_reached: true,
    threshold: 2,
    reachable: 3,
    node_results: [
      { node_id: "alpha", blake3_execution_hash: hash, mldsa_signature: "aa", status: "success" },
      { node_id: "beta", blake3_execution_hash: hash, mldsa_signature: "bb", status: "success" },
    ],
  };
}

const runners: SealDecisionRunners = {
  runSealed: async () => sealedOk,
  runQuorum: async () => quorum(),
};

describe("sealDecision", () => {
  it("returns the sealed refusal and sends nothing when the sealed node does not answer", async () => {
    let committed = false;
    const result = await sealDecision(
      { evidenceId: "evidence-1", decision: { outcome: "allow" } },
      {
        environmentId: "7d0af0ba-2ae3-4d0e-bc75-0bbaccb3dd71",
        operatorRelayer: true,
        relayerPrivateKey: "0x" + "11".repeat(32),
      },
      {
        runSealed: async () => {
          throw new VeyaSdkError("SEALED_UNREACHABLE", "sealed-node did not respond");
        },
        commit: async () => {
          committed = true;
          return { txHash: "0x" + "22".repeat(32), blockNumber: 1, explorerUrl: "https://example.invalid" };
        },
      },
    );
    expect(committed).toBe(false);
    expect(result).toEqual({
      ok: false,
      evidenceId: "evidence-1",
      code: "SEALED_UNREACHABLE",
      transaction: null,
      continuedOnOpenWorker: false,
    });
  });

  it("returns the quorum and sends nothing when no payer is passed and the relayer switch is off", async () => {
    let committed = false;
    const result = await sealDecision(
      { evidenceId: "evidence-1", decision: { outcome: "allow" } },
      {
        environmentId: "7d0af0ba-2ae3-4d0e-bc75-0bbaccb3dd71",
        operatorRelayer: false,
        relayerPrivateKey: "0x" + "11".repeat(32),
      },
      {
        ...runners,
        commit: async () => {
          committed = true;
          return { txHash: "0x" + "22".repeat(32), blockNumber: 1, explorerUrl: "https://example.invalid" };
        },
      },
    );
    expect(committed).toBe(false);
    expect(resolveSealPayer({ operatorRelayer: false, relayerPrivateKey: "0x" + "11".repeat(32) })).toBeUndefined();
    if (!result.ok) throw new Error("expected a sealed result");
    expect(result.sealed.runtime).toBe("AES-256-GCM");
    expect(result.sealed.transaction).toBeNull();
    expect(result.attestation.signatures).toHaveLength(2);
    expect(result.chain).toBeNull();
  });

  it("sets sealed.transaction to the same hash as chain.txHash when a payer commits", async () => {
    const tx = "0x" + "33".repeat(32);
    const result = await sealDecision(
      { evidenceId: "evidence-1", decision: { outcome: "allow" } },
      {
        environmentId: "7d0af0ba-2ae3-4d0e-bc75-0bbaccb3dd71",
        payerPrivateKey: "0x" + "44".repeat(32),
        network: "testnet",
      },
      {
        ...runners,
        commit: async () => ({ txHash: tx, blockNumber: 7, explorerUrl: "https://example.invalid/tx/" + tx }),
      },
    );
    if (!result.ok) throw new Error("expected a sealed result");
    expect(result.chain?.txHash).toBe(tx);
    expect(result.sealed.transaction).toBe(tx);
  });

  it("mainnet with an empty contract returns MAINNET_UNPUBLISHED and does not commit", async () => {
    const prev = process.env.VEYA_MAINNET_CONTRACT_ADDRESS;
    delete process.env.VEYA_MAINNET_CONTRACT_ADDRESS;
    let committed = false;
    try {
      await expect(
        sealDecision(
          { evidenceId: "evidence-1", decision: { outcome: "allow" } },
          {
            network: "mainnet",
            environmentId: "7d0af0ba-2ae3-4d0e-bc75-0bbaccb3dd71",
            contractAddress: "",
            payerPrivateKey: "0x" + "11".repeat(32),
          },
          {
            ...runners,
            commit: async () => {
              committed = true;
              throw new Error("sent");
            },
          },
        ),
      ).rejects.toMatchObject({ code: "MAINNET_UNPUBLISHED" });
      expect(committed).toBe(false);
    } finally {
      if (prev === undefined) delete process.env.VEYA_MAINNET_CONTRACT_ADDRESS;
      else process.env.VEYA_MAINNET_CONTRACT_ADDRESS = prev;
    }
  });

  it("guest settlement on mainnet is refused before a commit", async () => {
    let committed = false;
    await expect(
      sealDecision(
        { evidenceId: "evidence-1", decision: { outcome: "allow" } },
        {
          network: "mainnet",
          environmentId: "7d0af0ba-2ae3-4d0e-bc75-0bbaccb3dd71",
          guest: true,
          payerPrivateKey: "0x" + "11".repeat(32),
          contractAddress: "0x1a1Dc3c55550FCE9F70ef6cDEeF967c0b72a5d84",
        },
        {
          ...runners,
          commit: async () => {
            committed = true;
            throw new Error("sent");
          },
        },
      ),
    ).rejects.toMatchObject({ code: "GUEST_TESTNET_ONLY" });
    expect(committed).toBe(false);
  });
});
