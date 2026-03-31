import { Detection, Detector } from "../types";

// RFC 5322 simplified — handles most real-world email addresses
const EMAIL_RE =
  /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*/g;

// International phone numbers: +<country code> followed by groups of digits totaling 7+ digits
const PHONE_RE =
  /\+[1-9]\d{0,2}[\s.-]?\(?\d{1,4}\)?[\s.-]?\d{1,4}[\s.-]?\d{2,9}/g;

// US Social Security Number: XXX-XX-XXXX
const SSN_RE = /\b\d{3}-\d{2}-\d{4}\b/g;

// Credit card numbers: 13-19 digits with optional separators
const CREDIT_CARD_RE =
  /\b(?:\d[ -]*?){13,19}\b/g;

/**
 * Luhn algorithm — validates credit card check digit.
 */
function luhnCheck(digits: string): boolean {
  const nums = digits.replace(/\D/g, "");
  if (nums.length < 13 || nums.length > 19) return false;

  let sum = 0;
  let alternate = false;
  for (let i = nums.length - 1; i >= 0; i--) {
    let n = parseInt(nums[i], 10);
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

/** Known credit card prefixes (Visa, Mastercard, Amex, Discover) */
function looksLikeCreditCard(digits: string): boolean {
  const nums = digits.replace(/\D/g, "");
  if (nums.length < 13 || nums.length > 19) return false;
  const first = nums[0];
  const firstTwo = nums.substring(0, 2);
  const firstFour = nums.substring(0, 4);
  // Visa
  if (first === "4") return true;
  // Mastercard
  if (parseInt(firstTwo) >= 51 && parseInt(firstTwo) <= 55) return true;
  if (parseInt(firstFour) >= 2221 && parseInt(firstFour) <= 2720) return true;
  // Amex
  if (firstTwo === "34" || firstTwo === "37") return true;
  // Discover
  if (firstFour === "6011" || firstTwo === "65") return true;
  return false;
}

function findAll(
  re: RegExp,
  text: string,
  type: string,
  category: Detection["category"],
  severity: Detection["severity"],
  message: string,
  validate?: (match: string) => boolean
): Detection[] {
  const results: Detection[] = [];
  let match: RegExpExecArray | null;
  // Reset lastIndex for safety
  re.lastIndex = 0;
  while ((match = re.exec(text)) !== null) {
    if (validate && !validate(match[0])) continue;
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

export const detectEmails: Detector = (text) =>
  findAll(
    EMAIL_RE,
    text,
    "email",
    "pii",
    "medium",
    "Email address detected"
  );

export const detectPhoneNumbers: Detector = (text) =>
  findAll(
    PHONE_RE,
    text,
    "phone-number",
    "pii",
    "medium",
    "Phone number detected"
  );

export const detectSSNs: Detector = (text) =>
  findAll(SSN_RE, text, "ssn", "pii", "high", "Social Security Number detected");

export const detectCreditCards: Detector = (text) => {
  const results: Detection[] = [];
  let match: RegExpExecArray | null;
  CREDIT_CARD_RE.lastIndex = 0;
  while ((match = CREDIT_CARD_RE.exec(text)) !== null) {
    const raw = match[0];
    if (looksLikeCreditCard(raw) && luhnCheck(raw)) {
      results.push({
        type: "credit-card",
        category: "pii",
        severity: "high",
        start: match.index,
        end: match.index + raw.length,
        message: "Credit card number detected (Luhn validated)",
      });
    }
  }
  return results;
};

export const piiDetectors: Detector[] = [
  detectEmails,
  detectPhoneNumbers,
  detectSSNs,
  detectCreditCards,
];
