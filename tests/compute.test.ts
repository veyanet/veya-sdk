import { describe, it, expect, vi } from "vitest";
import { DecentralizedComputeResource } from "../src/modules/compute.js";
import { HttpClient } from "../src/client/http.js";

describe("decentralized compute resource", () => {
  it("posts decentralized execution request", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        const body = JSON.parse(init?.body as string);
        expect(body.nodesCount).toBe(4);
        expect(body.spendLamports).toBe(100);
        return {
          ok: true,
          status: 200,
          text: async () =>
            JSON.stringify({
              execution: {
                id: "ex-1",
                environmentId: "env",
                eventType: "decentralized_test",
                payload: {
                  test: true,
                  _decentralized: {
                    nodesCount: 4,
                    consensusReached: true,
                    nodes: [
                      { nodeId: "Node-Alpha", publicKey: "pub1", signature: "sig1", status: "SUCCESS" }
                    ]
                  }
                },
                protected: true,
                spendLamports: "100",
                createdAt: new Date().toISOString(),
              },
              consensus: {
                consensusReached: true,
                nodesCount: 4,
                nodes: [
                  { nodeId: "Node-Alpha", publicKey: "pub1", signature: "sig1", status: "SUCCESS" }
                ],
                stateHash: "hash123"
              },
              attestationTx: "sig",
            }),
        };
      })
    );

    // Initialize HttpClient pointing to the official VEYA Production API Gateway
    const http = new HttpClient({ apiUrl: "https://api.veyanet.tech", apiKey: "k" });
    const c = new DecentralizedComputeResource(http);
    const result = await c.run("env-id", {
      agentId: "agent-id",
      eventType: "decentralized_test",
      payload: { test: true },
      nodesCount: 4,
      commitResult: true,
      spendLamports: 100,
    });
    expect(result.attestationTx).toBe("sig");
    expect(result.consensus.consensusReached).toBe(true);
    expect(result.consensus.nodesCount).toBe(4);
    expect(result.consensus.nodes[0].nodeId).toBe("Node-Alpha");
  });
});
