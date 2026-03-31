# Currently Implemented

Last updated: 2026-03-31

---

## Monorepo Infrastructure

- npm workspaces linking `packages/*`, `extensions/*`, `apps/*`
- Root `package.json` with `build` and `test` scripts across all workspaces
- Shared `tsconfig.json` base configuration (ES2020, strict mode, declarations)
- `.gitignore` covering dependencies, build outputs, environment files, IDE files

---

## Core Detection Engine (`packages/core/`)

Shared TypeScript library with zero external dependencies. All processing is local.

### Types (`src/types.ts`)

- `Detection` interface: `type`, `category`, `severity`, `start`, `end`, `message`
- `Detector` function type: `(text: string) => Detection[]`
- `DetectorInfo` with name, description, enabled flag
- `ScanResult` with detections array, timestamp, text length
- `ScanOptions` for filtering by enabled detectors and minimum severity
- Categories: `pii`, `secret`, `credential`, `token`
- Severity levels: `low`, `medium`, `high`, `critical`

### PII Detectors (`src/detectors/pii.ts`) — 4 patterns

| Detector | What It Catches | Severity |
|----------|----------------|----------|
| `detectEmails` | Email addresses (RFC 5322 simplified regex, plus addressing, subdomains) | medium |
| `detectPhoneNumbers` | International phone numbers with `+` country code, parentheses, separators | medium |
| `detectSSNs` | US Social Security Numbers in `XXX-XX-XXXX` format | high |
| `detectCreditCards` | Credit card numbers with Luhn algorithm validation and known prefix matching (Visa, Mastercard, Amex, Discover) | high |

### Secret Detectors (`src/detectors/secrets.ts`) — 7 patterns

| Detector | What It Catches | Severity |
|----------|----------------|----------|
| `detectAWSAccessKeys` | AWS Access Key IDs (`AKIA` prefix, 20 chars) | critical |
| `detectAWSSecretKeys` | AWS Secret Access Keys (40-char strings near `aws_secret_access_key` identifiers) | critical |
| `detectGitHubTokens` | GitHub PATs — classic (`ghp_`) and fine-grained (`github_pat_`) | critical |
| `detectStripeKeys` | Stripe secret and restricted keys (`sk_live_`, `sk_test_`, `rk_live_`, `rk_test_`) | critical |
| `detectGoogleAPIKeys` | Google API keys (`AIza` prefix, 39 chars total) | high |
| `detectGoogleOAuthSecrets` | Google OAuth client secrets (in JSON or env var context) | critical |
| `detectSSHPrivateKeys` | Private SSH keys — RSA, EC, DSA, OpenSSH (PEM header/footer matching) | critical |

### Token Detectors (`src/detectors/tokens.ts`) — 2 patterns

| Detector | What It Catches | Severity |
|----------|----------------|----------|
| `detectJWTs` | JWT tokens (three base64url-encoded segments) | high |
| `detectDBConnectionStrings` | Database connection strings — PostgreSQL, MySQL, MongoDB (including `+srv`) | critical |

### Entropy Detector (`src/detectors/entropy.ts`) — 1 pattern

| Detector | What It Catches | Severity |
|----------|----------------|----------|
| `detectHighEntropy` | High-entropy strings (Shannon entropy > 4.5, 20-200 chars) with false positive filtering | medium |

False positive filters: rejects low character diversity, base64 padding-only strings, mostly-lowercase identifiers, and short hex hashes (lock files).

### Scanner (`src/index.ts`)

- `scan(text, options?)` — runs all 14 detectors, returns sorted detections with metadata
- `redact(text, detections)` — replaces all detected values with `[TYPE_REDACTED]` placeholders
- `getDetectors()` — returns list of all registered detectors with metadata
- Filtering: `enabledDetectors` list and `minSeverity` threshold
- Results sorted by character position in source text

### Test Suite (`tests/`)

60 unit tests across 5 test files using Node.js built-in test runner (`node:test`):

- `pii.test.ts` — 17 tests (emails, phones, SSNs, credit cards with Luhn validation)
- `secrets.test.ts` — 15 tests (AWS keys, GitHub PATs, Stripe, Google, SSH keys)
- `tokens.test.ts` — 8 tests (JWTs, database connection strings)
- `entropy.test.ts` — 10 tests (Shannon entropy calculation, false positive filtering)
- `scanner.test.ts` — 10 tests (multi-pattern scanning, filtering, redaction, clean text)

All tests cover true positives, true negatives, and edge cases.

---

## VS Code Extension (`extensions/vscode/`)

Full extension scaffold with all Phase 1 scanning features wired up.

### Document Scanning

- **Real-time scanning** on every keystroke via `onDidChangeTextDocument` listener (300ms debounce)
- Scans on document open and active editor change
- Skips files > 1MB for performance
- Only scans `file://` and `untitled:` URI schemes

### Inline Diagnostics

- PII detections shown as **yellow warnings** (configurable)
- Secrets/credentials/tokens shown as **red errors** (configurable)
- Each diagnostic includes detection type as the code and human-readable message
- Source label: "AI Redact"

### Quick-Fix Code Actions

- Lightbulb menu on each finding: "Redact this [type]"
- Replaces the matched value with `[TYPE_REDACTED]` placeholder
- Registered for all languages (`*` selector)

### Commands

| Command | What It Does |
|---------|-------------|
| `AI Redact: Scan Current File` | Manually triggers a full scan of the active file |
| `AI Redact: Redact All Findings in Current File` | Replaces all findings with placeholders (with confirmation dialog) |
| `AI Redact: Toggle Scanner` | Enables or disables scanning globally |

### Status Bar

- Right-aligned status bar item with shield icon
- Shows "Clean" (no findings), finding count with warning background, or "Off" when disabled
- Clicking toggles the scanner on/off

### Configuration (`aiRedact.*` settings)

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `enabled` | boolean | `true` | Master on/off switch |
| `scanOnType` | boolean | `true` | Scan as you type |
| `minSeverity` | enum | `"medium"` | Minimum severity to report |
| `enabledDetectors` | string[] | `[]` (all) | Specific detectors to enable |
| `secretSeverity` | enum | `"error"` | Diagnostic level for secrets |
| `piiSeverity` | enum | `"warning"` | Diagnostic level for PII |

### Extension Metadata

- Publisher: `liorahq`
- Activation: `onStartupFinished`
- 15 marketplace keywords targeting AI security, DLP, PII, secrets, GDPR, EU AI Act
- Categories: Other, Linters, Programming Languages

---

## Project Structure

```
ai-redact/
├── package.json                  # Monorepo root with npm workspaces
├── tsconfig.json                 # Shared TypeScript config
├── .gitignore
├── LICENSE                       # Apache 2.0
├── README.md
├── CONTRIBUTING.md
├── documentation/
│   ├── currently-implemented.md  # This file
│   └── future-implementation.md
├── packages/
│   └── core/
│       ├── package.json
│       ├── tsconfig.json
│       ├── tsconfig.test.json
│       ├── src/
│       │   ├── index.ts          # scan(), redact(), getDetectors()
│       │   ├── types.ts          # Detection, Detector, ScanResult, ScanOptions
│       │   └── detectors/
│       │       ├── index.ts      # Re-exports all detectors
│       │       ├── pii.ts        # 4 PII detectors
│       │       ├── secrets.ts    # 7 secret detectors
│       │       ├── tokens.ts     # 2 token detectors
│       │       └── entropy.ts    # 1 entropy detector
│       └── tests/
│           ├── pii.test.ts
│           ├── secrets.test.ts
│           ├── tokens.test.ts
│           ├── entropy.test.ts
│           └── scanner.test.ts
├── extensions/
│   ├── vscode/
│   │   ├── package.json          # Extension manifest with contributes
│   │   ├── tsconfig.json
│   │   └── src/
│   │       └── extension.ts      # Full extension: diagnostics, quick-fix, status bar
│   └── chrome/                   # Placeholder
└── apps/
    └── dashboard/                # Placeholder
```
