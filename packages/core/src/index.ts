import { Detection, Detector, DetectorInfo, ScanOptions, ScanResult, Severity } from "./types";
import { piiDetectors } from "./detectors/pii";
import { secretDetectors } from "./detectors/secrets";
import { tokenDetectors } from "./detectors/tokens";
import { entropyDetectors } from "./detectors/entropy";

export * from "./types";
export * from "./detectors";

const SEVERITY_ORDER: Record<Severity, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

const ALL_DETECTORS: DetectorInfo[] = [
  // PII
  { name: "email", description: "Email addresses (RFC 5322)", detector: piiDetectors[0], enabled: true },
  { name: "phone-number", description: "International phone numbers", detector: piiDetectors[1], enabled: true },
  { name: "ssn", description: "US Social Security Numbers", detector: piiDetectors[2], enabled: true },
  { name: "credit-card", description: "Credit card numbers (Luhn validated)", detector: piiDetectors[3], enabled: true },
  // Secrets
  { name: "aws-access-key", description: "AWS Access Key IDs", detector: secretDetectors[0], enabled: true },
  { name: "aws-secret-key", description: "AWS Secret Access Keys", detector: secretDetectors[1], enabled: true },
  { name: "github-pat", description: "GitHub Personal Access Tokens", detector: secretDetectors[2], enabled: true },
  { name: "stripe-key", description: "Stripe API keys", detector: secretDetectors[3], enabled: true },
  { name: "google-api-key", description: "Google API keys", detector: secretDetectors[4], enabled: true },
  { name: "google-oauth-secret", description: "Google OAuth client secrets", detector: secretDetectors[5], enabled: true },
  { name: "ssh-private-key", description: "SSH private keys (RSA, ED25519)", detector: secretDetectors[6], enabled: true },
  // Tokens
  { name: "jwt", description: "JWT tokens", detector: tokenDetectors[0], enabled: true },
  { name: "db-connection-string", description: "Database connection strings", detector: tokenDetectors[1], enabled: true },
  // Entropy
  { name: "high-entropy-string", description: "High-entropy strings (Shannon > 4.5)", detector: entropyDetectors[0], enabled: true },
];

export function getDetectors(): DetectorInfo[] {
  return ALL_DETECTORS.map((d) => ({ ...d }));
}

export function scan(text: string, options?: ScanOptions): ScanResult {
  const detections: Detection[] = [];
  const minSev = options?.minSeverity ? SEVERITY_ORDER[options.minSeverity] : 0;

  for (const info of ALL_DETECTORS) {
    if (options?.enabledDetectors && !options.enabledDetectors.includes(info.name)) {
      continue;
    }

    const found = info.detector(text);
    for (const d of found) {
      if (SEVERITY_ORDER[d.severity] >= minSev) {
        detections.push(d);
      }
    }
  }

  // Sort by position in text
  detections.sort((a, b) => a.start - b.start);

  return {
    detections,
    scannedAt: Date.now(),
    textLength: text.length,
  };
}

/**
 * Redact all detections in a string, replacing matches with placeholders.
 */
export function redact(text: string, detections: Detection[]): string {
  // Process from end to start so offsets remain valid
  const sorted = [...detections].sort((a, b) => b.start - a.start);
  let result = text;
  for (const d of sorted) {
    const placeholder = `[${d.type.toUpperCase()}_REDACTED]`;
    result = result.substring(0, d.start) + placeholder + result.substring(d.end);
  }
  return result;
}
