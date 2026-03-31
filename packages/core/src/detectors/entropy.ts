import { Detection, Detector } from "../types";

const DEFAULT_THRESHOLD = 4.5;
const MIN_LENGTH = 20;
const MAX_LENGTH = 200;

// Match sequences of alphanumeric + common secret chars that are long enough
const HIGH_ENTROPY_CANDIDATE_RE = /[A-Za-z0-9+/=_-]{20,200}/g;

/**
 * Shannon entropy — measures randomness of a string.
 * English text ≈ 3.5-4.0, random secrets ≈ 4.5-6.0.
 */
export function shannonEntropy(s: string): number {
  if (s.length === 0) return 0;

  const freq = new Map<string, number>();
  for (const ch of s) {
    freq.set(ch, (freq.get(ch) || 0) + 1);
  }

  let entropy = 0;
  const len = s.length;
  for (const count of freq.values()) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

/**
 * Filter out common false positives: base64-encoded common strings,
 * well-known library hashes, import paths, etc.
 */
function isLikelySecret(candidate: string): boolean {
  // Skip if it's all the same character repeated
  if (new Set(candidate).size < 4) return false;

  // Skip common base64 padding-only strings
  if (/^[A-Za-z0-9+/]*={2,}$/.test(candidate)) return false;

  // Skip if it looks like a common word/identifier (mostly lowercase letters)
  const lowerCount = (candidate.match(/[a-z]/g) || []).length;
  if (lowerCount / candidate.length > 0.85) return false;

  // Skip hex-like hashes that are very common in lock files
  if (/^[0-9a-f]+$/i.test(candidate) && candidate.length <= 64) return false;

  return true;
}

export const detectHighEntropy: Detector = (
  text,
  threshold: number = DEFAULT_THRESHOLD
) => {
  const results: Detection[] = [];
  let match: RegExpExecArray | null;
  HIGH_ENTROPY_CANDIDATE_RE.lastIndex = 0;

  while ((match = HIGH_ENTROPY_CANDIDATE_RE.exec(text)) !== null) {
    const candidate = match[0];
    if (candidate.length < MIN_LENGTH || candidate.length > MAX_LENGTH) continue;
    if (!isLikelySecret(candidate)) continue;

    const entropy = shannonEntropy(candidate);
    if (entropy > threshold) {
      results.push({
        type: "high-entropy-string",
        category: "secret",
        severity: "medium",
        start: match.index,
        end: match.index + candidate.length,
        message: `High-entropy string detected (entropy: ${entropy.toFixed(2)})`,
      });
    }
  }
  return results;
};

export const entropyDetectors: Detector[] = [detectHighEntropy];
