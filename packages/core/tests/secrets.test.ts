import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import {
  detectAWSAccessKeys,
  detectAWSSecretKeys,
  detectGitHubTokens,
  detectStripeKeys,
  detectGoogleAPIKeys,
  detectGoogleOAuthSecrets,
  detectSSHPrivateKeys,
} from "../src/detectors/secrets";

describe("detectAWSAccessKeys", () => {
  it("detects AWS access key", () => {
    const results = detectAWSAccessKeys("aws_access_key_id = AKIAIOSFODNN7EXAMPLE");
    assert.equal(results.length, 1);
    assert.equal(results[0].type, "aws-access-key");
    assert.equal(results[0].severity, "critical");
  });

  it("does not match non-AKIA prefix", () => {
    const results = detectAWSAccessKeys("key = ASIAIOSFODNN7EXAMPLE");
    assert.equal(results.length, 0);
  });

  it("does not match too-short keys", () => {
    const results = detectAWSAccessKeys("AKIA1234");
    assert.equal(results.length, 0);
  });
});

describe("detectAWSSecretKeys", () => {
  it("detects AWS secret key in config format", () => {
    const results = detectAWSSecretKeys(
      'aws_secret_access_key = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"'
    );
    assert.equal(results.length, 1);
    assert.equal(results[0].type, "aws-secret-key");
  });

  it("detects AWS secret key with colon separator", () => {
    const results = detectAWSSecretKeys(
      "AWS_SECRET_ACCESS_KEY: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
    );
    assert.equal(results.length, 1);
  });
});

describe("detectGitHubTokens", () => {
  it("detects classic GitHub PAT (ghp_)", () => {
    const results = detectGitHubTokens(
      "token = ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghij"
    );
    assert.equal(results.length, 1);
    assert.equal(results[0].type, "github-pat");
    assert.equal(results[0].severity, "critical");
  });

  it("detects fine-grained GitHub PAT", () => {
    const results = detectGitHubTokens(
      "GITHUB_TOKEN=github_pat_11ABCDEFG0ABCDEFGHIJKL_AbCdEfGhIjKlMnOpQrStUvWxYzAbCdEfGhIjKlMnOpQrStUvWxYz1234567890Ab"
    );
    assert.equal(results.length, 1);
  });

  it("does not match partial tokens", () => {
    const results = detectGitHubTokens("ghp_short");
    assert.equal(results.length, 0);
  });
});

describe("detectStripeKeys", () => {
  it("detects Stripe live secret key", () => {
    const results = detectStripeKeys(
      "STRIPE_KEY=sk_live_4eC39HqLyjWDarjtT1zdp7dc"
    );
    assert.equal(results.length, 1);
    assert.equal(results[0].type, "stripe-key");
  });

  it("detects Stripe test key", () => {
    const results = detectStripeKeys("sk_test_4eC39HqLyjWDarjtT1zdp7dc");
    assert.equal(results.length, 1);
  });

  it("does not match publishable keys (not secret)", () => {
    const results = detectStripeKeys("pk_live_4eC39HqLyjWDarjtT1zdp7dc");
    assert.equal(results.length, 0);
  });
});

describe("detectGoogleAPIKeys", () => {
  it("detects Google API key", () => {
    // AIza + exactly 35 chars = 39 total
    const results = detectGoogleAPIKeys("GOOGLE_KEY=AIzaSyBf1Qk3Z5KrN_abc-DEFghijkl12345mn0");
    assert.equal(results.length, 1);
    assert.equal(results[0].type, "google-api-key");
  });

  it("does not match short strings starting with AIza", () => {
    const results = detectGoogleAPIKeys("AIzaShort");
    assert.equal(results.length, 0);
  });
});

describe("detectGoogleOAuthSecrets", () => {
  it("detects client_secret in JSON", () => {
    const results = detectGoogleOAuthSecrets(
      '"client_secret": "GOCSPX-abcdef1234567890abcdef"'
    );
    assert.equal(results.length, 1);
    assert.equal(results[0].type, "google-oauth-secret");
  });

  it("detects env var style", () => {
    const results = detectGoogleOAuthSecrets(
      "GOOGLE_CLIENT_SECRET=GOCSPX-abcdef1234567890abcdef"
    );
    assert.equal(results.length, 1);
  });
});

describe("detectSSHPrivateKeys", () => {
  it("detects RSA private key", () => {
    const key = `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA04k/fcwDm9Ym
-----END RSA PRIVATE KEY-----`;
    const results = detectSSHPrivateKeys(key);
    assert.equal(results.length, 1);
    assert.equal(results[0].type, "ssh-private-key");
    assert.equal(results[0].severity, "critical");
  });

  it("detects OpenSSH private key", () => {
    const key = `-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAA
-----END OPENSSH PRIVATE KEY-----`;
    const results = detectSSHPrivateKeys(key);
    assert.equal(results.length, 1);
  });

  it("does not match public keys", () => {
    const pub = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A
-----END PUBLIC KEY-----`;
    const results = detectSSHPrivateKeys(pub);
    assert.equal(results.length, 0);
  });
});
