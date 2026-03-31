import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { execSync } from "node:child_process";
import * as path from "node:path";

const CLI_JS = path.resolve(__dirname, "../src/index.js");

function run(args: string, stdin?: string): { stdout: string; exitCode: number } {
  try {
    const result = execSync(`node ${CLI_JS} ${args}`, {
      input: stdin ?? "",
      encoding: "utf-8",
      timeout: 5000,
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { stdout: result, exitCode: 0 };
  } catch (err: any) {
    return { stdout: (err.stdout || "") + (err.stderr || ""), exitCode: err.status ?? 1 };
  }
}

describe("CLI scan", () => {
  it("detects secrets from stdin", () => {
    const { stdout, exitCode } = run("scan --stdin", "key = AKIAIOSFODNN7EXAMPLE");
    assert.equal(exitCode, 1);
    assert.ok(stdout.includes("aws-access-key"));
    assert.ok(stdout.includes("CRITICAL"));
  });

  it("exits 0 for clean input", () => {
    const { stdout, exitCode } = run("scan --stdin", "just a normal string");
    assert.equal(exitCode, 0);
    assert.ok(stdout.includes("clean"));
  });

  it("supports piped input without --stdin flag", () => {
    const { exitCode } = run("scan", "email: user@example.com");
    assert.equal(exitCode, 1);
  });

  it("outputs JSON with --json", () => {
    const { stdout, exitCode } = run("scan --stdin --json", "SSN: 123-45-6789");
    assert.equal(exitCode, 1);
    const parsed = JSON.parse(stdout);
    assert.equal(parsed.clean, false);
    assert.equal(parsed.detections.length, 1);
    assert.equal(parsed.detections[0].type, "ssn");
    assert.equal(parsed.detections[0].line, 1);
  });

  it("outputs clean JSON for clean input", () => {
    const { stdout, exitCode } = run("scan --stdin --json", "nothing here");
    assert.equal(exitCode, 0);
    const parsed = JSON.parse(stdout);
    assert.equal(parsed.clean, true);
    assert.equal(parsed.detections.length, 0);
  });

  it("redacts output with --redact", () => {
    const { stdout, exitCode } = run("scan --stdin --redact", "email: user@example.com");
    assert.equal(exitCode, 1);
    assert.ok(stdout.includes("[EMAIL_REDACTED]"));
    assert.ok(!stdout.includes("user@example.com"));
  });

  it("exits 2 in hook mode when findings exist", () => {
    const { exitCode } = run("scan --stdin --hook --quiet", "AKIAIOSFODNN7EXAMPLE");
    assert.equal(exitCode, 2);
  });

  it("exits 0 in hook mode when clean", () => {
    const { exitCode } = run("scan --stdin --hook --quiet", "nothing sensitive");
    assert.equal(exitCode, 0);
  });

  it("suppresses output with --quiet", () => {
    const { stdout, exitCode } = run("scan --stdin --quiet", "AKIAIOSFODNN7EXAMPLE");
    assert.equal(exitCode, 1);
    assert.equal(stdout.trim(), "");
  });

  it("filters by --min-severity", () => {
    const { stdout } = run("scan --stdin --json --min-severity high", "user@example.com SSN: 123-45-6789");
    const parsed = JSON.parse(stdout);
    assert.ok(parsed.detections.every((d: any) => d.severity === "high" || d.severity === "critical"));
  });

  it("shows help with --help", () => {
    const { stdout, exitCode } = run("--help", "");
    assert.equal(exitCode, 0);
    assert.ok(stdout.includes("USAGE"));
    assert.ok(stdout.includes("CLAUDE CODE INTEGRATION"));
  });

  it("shows version with --version", () => {
    const { stdout, exitCode } = run("--version", "");
    assert.equal(exitCode, 0);
    assert.ok(stdout.includes("0.1.0"));
  });

  it("lists detectors with --list-detectors", () => {
    const { stdout, exitCode } = run("--list-detectors", "");
    assert.equal(exitCode, 0);
    assert.ok(stdout.includes("email"));
    assert.ok(stdout.includes("aws-access-key"));
    assert.ok(stdout.includes("ssh-private-key"));
  });
});
