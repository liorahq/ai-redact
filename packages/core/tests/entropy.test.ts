import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { detectHighEntropy, shannonEntropy } from "../src/detectors/entropy";

describe("shannonEntropy", () => {
  it("returns 0 for empty string", () => {
    assert.equal(shannonEntropy(""), 0);
  });

  it("returns 0 for single-character string", () => {
    assert.equal(shannonEntropy("aaaa"), 0);
  });

  it("returns ~1 for two equally distributed characters", () => {
    const e = shannonEntropy("ababababababababababab");
    assert.ok(e > 0.9 && e < 1.1, `Expected ~1, got ${e}`);
  });

  it("returns high entropy for random-looking strings", () => {
    const e = shannonEntropy("aB3$kL9!mN2@pQ7&xZ5*");
    assert.ok(e > 4.0, `Expected > 4.0, got ${e}`);
  });
});

describe("detectHighEntropy", () => {
  it("detects high-entropy secret-like strings", () => {
    // Simulated API key with high entropy
    const results = detectHighEntropy(
      "SECRET_KEY=A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9t0"
    );
    assert.ok(results.length >= 1);
    assert.equal(results[0].type, "high-entropy-string");
  });

  it("ignores normal English-like text", () => {
    const results = detectHighEntropy(
      "This is a perfectly normal sentence with nothing suspicious."
    );
    assert.equal(results.length, 0);
  });

  it("ignores short strings", () => {
    const results = detectHighEntropy("Abc123");
    assert.equal(results.length, 0);
  });

  it("ignores strings with low character diversity", () => {
    const results = detectHighEntropy("aaaaaaaaaaaaaaaaaaaaaaaaa");
    assert.equal(results.length, 0);
  });

  it("ignores hex hashes under 64 chars", () => {
    const results = detectHighEntropy(
      "hash=a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6"
    );
    assert.equal(results.length, 0);
  });
});
