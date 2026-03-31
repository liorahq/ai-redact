import { Detection, Detector } from "../types";

// JWT: three base64url-encoded segments separated by dots
const JWT_RE =
  /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g;

// Database connection strings
const DB_CONNECTION_RE =
  /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^\s'"`,}{)]+/g;

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

export const detectJWTs: Detector = (text) =>
  findAll(JWT_RE, text, "jwt", "token", "high", "JWT token detected");

export const detectDBConnectionStrings: Detector = (text) =>
  findAll(
    DB_CONNECTION_RE,
    text,
    "db-connection-string",
    "credential",
    "critical",
    "Database connection string detected"
  );

export const tokenDetectors: Detector[] = [detectJWTs, detectDBConnectionStrings];
