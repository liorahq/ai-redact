import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { scan, redact } from "../src/index";

describe("scan", () => {
  it("detects multiple types in a single text", () => {
    const text = `
      const email = "user@example.com";
      const key = "AKIAIOSFODNN7EXAMPLE";
      const ssn = "123-45-6789";
    `;
    const result = scan(text);
    assert.ok(result.detections.length >= 3);
    const types = result.detections.map((d) => d.type);
    assert.ok(types.includes("email"));
    assert.ok(types.includes("aws-access-key"));
    assert.ok(types.includes("ssn"));
  });

  it("respects enabledDetectors filter", () => {
    const text = 'user@example.com and SSN 123-45-6789';
    const result = scan(text, { enabledDetectors: ["email"] });
    assert.ok(result.detections.every((d) => d.type === "email"));
  });

  it("respects minSeverity filter", () => {
    const text = 'user@example.com AKIAIOSFODNN7EXAMPLE';
    const result = scan(text, { minSeverity: "critical" });
    assert.ok(result.detections.every((d) => d.severity === "critical"));
  });

  it("returns detections sorted by position", () => {
    const text = 'SSN: 111-22-3333 Email: a@b.com Key: AKIAIOSFODNN7EXAMPLE';
    const result = scan(text);
    for (let i = 1; i < result.detections.length; i++) {
      assert.ok(result.detections[i].start >= result.detections[i - 1].start);
    }
  });

  it("includes metadata in scan result", () => {
    const text = "hello world";
    const result = scan(text);
    assert.equal(result.textLength, text.length);
    assert.ok(result.scannedAt > 0);
  });

  it("returns empty for clean text", () => {
    const result = scan("Just a normal comment about the weather.");
    assert.equal(result.detections.length, 0);
  });
});

describe("redact", () => {
  it("replaces detections with placeholders", () => {
    const text = "Email: user@example.com and SSN: 123-45-6789";
    const result = scan(text);
    const redacted = redact(text, result.detections);
    assert.ok(!redacted.includes("user@example.com"));
    assert.ok(!redacted.includes("123-45-6789"));
    assert.ok(redacted.includes("[EMAIL_REDACTED]"));
    assert.ok(redacted.includes("[SSN_REDACTED]"));
  });

  it("handles empty detections", () => {
    const text = "Nothing to redact here";
    assert.equal(redact(text, []), text);
  });
});
