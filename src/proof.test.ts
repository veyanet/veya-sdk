import { describe, expect, it } from "vitest";
import { canonicalJson } from "./proof.js";
import { hashBlake3 } from "./pq/blake3.js";

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

  it("keeps array order", () => {
    expect(canonicalJson(["b", "a"])).toBe('["b","a"]');
    expect(canonicalJson(["b", "a"])).not.toBe(canonicalJson(["a", "b"]));
  });
});
