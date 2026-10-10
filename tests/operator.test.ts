import { describe, expect, it } from "vitest";
import { VeyaClient } from "../src/client/VeyaClient.js";
import { setSpendingLimit, recordSpend, remainingSpend } from "../src/spending/limits.js";
import { setToolPolicy, routeMessage, isVeyaToolName } from "../src/coordination/router.js";
import { storeMemory } from "../src/memory/nullifier.js";
import { MEMORY_FILE } from "../src/memory/store.js";
import { VeyaSdkError } from "../src/errors/veya-error.js";
import fs from "node:fs";
import { uuidStringToBytes, uuidBytesToString } from "../src/encoding/uuid.js";

describe("operator surfaces", () => {
  it("hashes with VeyaClient without a payer key", async () => {
    const client = new VeyaClient();
    expect(client.evm).toBeUndefined();
    const digest = await client.hashBlake3("robinhood-sdk");
    expect(digest).toHaveLength(64);
  });

  it("round-trips UUID bytes16", () => {
    const id = "3fa85f64-5717-4562-b3fc-2c963f66afa6";
    const bytes = uuidStringToBytes(id);
    expect(bytes).toHaveLength(16);
    expect(uuidBytesToString(bytes)).toBe(id);
  });

  it("enforces wei spending caps", () => {
    setSpendingLimit("env", "agent", 1000, 3600);
    recordSpend("env", "agent", 400);
    expect(remainingSpend("env", "agent")).toBe(600n);
    expect(() => recordSpend("env", "agent", 700)).toThrow(VeyaSdkError);
  });

  it("denies tools not in policy", () => {
    const scope = "operator-test-scope";
    setToolPolicy("agent-a", "veya_hash_blake3", true, scope);
    expect(isVeyaToolName("veya_hash_blake3")).toBe(true);
    const denied = routeMessage({
      id: "1",
      fromAgent: "agent-a",
      toAgent: "agent-b",
      tool: "transfer",
      payload: {},
    }, scope);
    expect(denied.policyStatus).toBe("denied");
  });

  it("refuses memory and policy with no owner scope and does not write the shared file", async () => {
    const before = fs.existsSync(MEMORY_FILE) ? fs.statSync(MEMORY_FILE).mtimeMs : 0;
    await expect(storeMemory("env", "agent", "note", "")).rejects.toThrow(/owner scope is required/);
    expect(() => setToolPolicy("agent-a", "veya_hash_blake3", true, "")).toThrow(/owner scope is required/);
    const after = fs.existsSync(MEMORY_FILE) ? fs.statSync(MEMORY_FILE).mtimeMs : 0;
    expect(after).toBe(before);
  });
});
