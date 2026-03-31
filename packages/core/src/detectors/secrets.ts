import { Detection, Detector } from "../types";

// AWS Access Key ID: starts with AKIA, 20 uppercase alphanumeric chars
const AWS_ACCESS_KEY_RE = /\bAKIA[0-9A-Z]{16}\b/g;

// AWS Secret Access Key: 40-char base64-ish string (often near "aws_secret" or as a standalone)
const AWS_SECRET_KEY_RE =
  /\b(?:aws_secret_access_key|AWS_SECRET_ACCESS_KEY|secret_access_key)\s*[=:]\s*["']?([A-Za-z0-9/+=]{40})["']?/g;

// GitHub Personal Access Token (classic: ghp_, fine-grained: github_pat_)
const GITHUB_PAT_RE = /\b(ghp_[A-Za-z0-9_]{36}|github_pat_[A-Za-z0-9_]{22,})\b/g;

// Stripe API keys: sk_live_, sk_test_, rk_live_, rk_test_
const STRIPE_KEY_RE = /\b[sr]k_(live|test)_[A-Za-z0-9]{20,}\b/g;

// Google API key
const GOOGLE_API_KEY_RE = /\bAIza[0-9A-Za-z_-]{35}\b/g;

// Google OAuth client secret (in JSON or env context)
const GOOGLE_OAUTH_SECRET_RE =
  /"?(?:client_secret|GOOGLE_CLIENT_SECRET)"?\s*[=:]\s*"?([A-Za-z0-9_-]{24,})"?/g;

// Private SSH keys (RSA, ED25519, EC, DSA)
const SSH_PRIVATE_KEY_RE =
  /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g;

function findAll(
  re: RegExp,
  text: string,
  type: string,
  category: Detection["category"],
  severity: Detection["severity"],
  message: string
): Detection[] {
  const results: Detection[] = [];
  let match: RegExpExecArray | null;
  re.lastIndex = 0;
  while ((match = re.exec(text)) !== null) {
    results.push({
      type,
      category,
      severity,
      start: match.index,
      end: match.index + match[0].length,
      message,
    });
  }
  return results;
}

export const detectAWSAccessKeys: Detector = (text) =>
  findAll(
    AWS_ACCESS_KEY_RE,
    text,
    "aws-access-key",
    "secret",
    "critical",
    "AWS Access Key ID detected"
  );

export const detectAWSSecretKeys: Detector = (text) =>
  findAll(
    AWS_SECRET_KEY_RE,
    text,
    "aws-secret-key",
    "secret",
    "critical",
    "AWS Secret Access Key detected"
  );

export const detectGitHubTokens: Detector = (text) =>
  findAll(
    GITHUB_PAT_RE,
    text,
    "github-pat",
    "secret",
    "critical",
    "GitHub Personal Access Token detected"
  );

export const detectStripeKeys: Detector = (text) =>
  findAll(
    STRIPE_KEY_RE,
    text,
    "stripe-key",
    "secret",
    "critical",
    "Stripe API key detected"
  );

export const detectGoogleAPIKeys: Detector = (text) =>
  findAll(
    GOOGLE_API_KEY_RE,
    text,
    "google-api-key",
    "secret",
    "high",
    "Google API key detected"
  );

export const detectGoogleOAuthSecrets: Detector = (text) =>
  findAll(
    GOOGLE_OAUTH_SECRET_RE,
    text,
    "google-oauth-secret",
    "credential",
    "critical",
    "Google OAuth client secret detected"
  );

export const detectSSHPrivateKeys: Detector = (text) =>
  findAll(
    SSH_PRIVATE_KEY_RE,
    text,
    "ssh-private-key",
    "secret",
    "critical",
    "Private SSH key detected"
  );

export const secretDetectors: Detector[] = [
  detectAWSAccessKeys,
  detectAWSSecretKeys,
  detectGitHubTokens,
  detectStripeKeys,
  detectGoogleAPIKeys,
  detectGoogleOAuthSecrets,
  detectSSHPrivateKeys,
];
