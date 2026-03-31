import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { detectJWTs, detectDBConnectionStrings } from "../src/detectors/tokens";

describe("detectJWTs", () => {
  it("detects a valid JWT structure", () => {
    // Real JWT structure (header.payload.signature)
    const jwt =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIn0.Gfx6VO9tcxwk6xqx9yYzSfebfeakZp5JYIgP_edcw_A";
    const results = detectJWTs(`Authorization: Bearer ${jwt}`);
    assert.equal(results.length, 1);
    assert.equal(results[0].type, "jwt");
    assert.equal(results[0].severity, "high");
  });

  it("does not match random dotted strings", () => {
    const results = detectJWTs("version 1.2.3");
    assert.equal(results.length, 0);
  });

  it("does not match two-segment strings", () => {
    const results = detectJWTs("eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0");
    assert.equal(results.length, 0);
  });
});

describe("detectDBConnectionStrings", () => {
  it("detects PostgreSQL connection string", () => {
    const results = detectDBConnectionStrings(
      "DATABASE_URL=postgresql://user:password@localhost:5432/mydb"
    );
    assert.equal(results.length, 1);
    assert.equal(results[0].type, "db-connection-string");
    assert.equal(results[0].severity, "critical");
  });

  it("detects MySQL connection string", () => {
    const results = detectDBConnectionStrings(
      'const url = "mysql://root:secret@db.example.com:3306/app"'
    );
    assert.equal(results.length, 1);
  });

  it("detects MongoDB connection string", () => {
    const results = detectDBConnectionStrings(
      "MONGO_URI=mongodb+srv://admin:pass123@cluster0.abc.mongodb.net/test"
    );
    assert.equal(results.length, 1);
  });

  it("detects plain MongoDB connection string", () => {
    const results = detectDBConnectionStrings(
      "mongodb://localhost:27017/myapp"
    );
    assert.equal(results.length, 1);
  });

  it("does not match http URLs", () => {
    const results = detectDBConnectionStrings("https://example.com");
    assert.equal(results.length, 0);
  });
});
