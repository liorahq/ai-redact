# Currently Implemented

Last updated: 2026-03-31

---

## Monorepo Infrastructure

- npm workspaces linking `packages/*`, `extensions/*`, `apps/*`
- Root `package.json` with `build` and `test` scripts across all workspaces
- Shared `tsconfig.json` base configuration (ES2020, strict mode, declarations)
- `.gitignore` covering dependencies, build outputs, environment files, IDE files
- Zero external runtime dependencies in the core detection engine
- `@types/node` and `typescript` as dev dependencies only

---

## Core Detection Engine (`packages/core/`)

Shared TypeScript library with zero external dependencies. All processing is local.

### Types (`src/types.ts`)

| Export | Description |
|--------|-------------|
| `Detection` | Interface: `type`, `category`, `severity`, `start`, `end`, `message` |
| `Detector` | Function type: `(text: string) => Detection[]` |
| `DetectorInfo` | Metadata wrapper: `name`, `description`, `detector`, `enabled` |
| `ScanResult` | Return type of `scan()`: `detections[]`, `scannedAt`, `textLength` |
| `ScanOptions` | Filtering: `enabledDetectors?: string[]`, `minSeverity?: Severity` |
| `Category` | Union: `"pii"` / `"secret"` / `"credential"` / `"token"` |
| `Severity` | Union: `"low"` / `"medium"` / `"high"` / `"critical"` |

### PII Detectors (`src/detectors/pii.ts`) — 4 patterns

| Detector | What It Catches | Severity | Validation |
|----------|----------------|----------|------------|
| `detectEmails` | Email addresses (RFC 5322 simplified, plus addressing, subdomains) | medium | Regex match |
| `detectPhoneNumbers` | International phone numbers with `+` country code, parentheses, separators, minimum digit count | medium | Regex match + length check |
| `detectSSNs` | US Social Security Numbers in `XXX-XX-XXXX` format | high | Regex with word boundaries |
| `detectCreditCards` | Credit card numbers (13-19 digits with optional separators) | high | Luhn algorithm + known prefix matching (Visa, Mastercard, Amex, Discover) |

### Secret Detectors (`src/detectors/secrets.ts`) — 7 patterns

| Detector | What It Catches | Severity | Pattern |
|----------|----------------|----------|---------|
| `detectAWSAccessKeys` | AWS Access Key IDs | critical | `AKIA` prefix + 16 uppercase alphanumeric chars |
| `detectAWSSecretKeys` | AWS Secret Access Keys | critical | 40-char base64 string near `aws_secret_access_key` / `AWS_SECRET_ACCESS_KEY` identifier |
| `detectGitHubTokens` | GitHub Personal Access Tokens | critical | `ghp_` + 36 chars (classic) or `github_pat_` + 22+ chars (fine-grained) |
| `detectStripeKeys` | Stripe secret and restricted keys | critical | `sk_live_` / `sk_test_` / `rk_live_` / `rk_test_` + 20+ alphanumeric chars |
| `detectGoogleAPIKeys` | Google API keys | high | `AIza` prefix + 35 chars (39 total) |
| `detectGoogleOAuthSecrets` | Google OAuth client secrets | critical | `client_secret` or `GOOGLE_CLIENT_SECRET` key + 24+ char value (JSON or env format) |
| `detectSSHPrivateKeys` | Private SSH keys | critical | PEM header/footer matching for RSA, EC, DSA, OpenSSH key types |

### Token Detectors (`src/detectors/tokens.ts`) — 2 patterns

| Detector | What It Catches | Severity | Pattern |
|----------|----------------|----------|---------|
| `detectJWTs` | JWT tokens | high | Three base64url-encoded segments starting with `eyJ` |
| `detectDBConnectionStrings` | Database connection strings | critical | `postgresql://`, `mysql://`, `mongodb://`, `mongodb+srv://` URI schemes |

### Entropy Detector (`src/detectors/entropy.ts`) — 1 pattern

| Detector | What It Catches | Severity | Method |
|----------|----------------|----------|--------|
| `detectHighEntropy` | High-entropy strings (Shannon entropy > 4.5, 20-200 chars) | medium | Shannon entropy calculation with false positive filtering |

False positive filters:
- Rejects strings with < 4 unique characters
- Rejects base64 padding-only strings
- Rejects mostly-lowercase identifiers (> 85% lowercase)
- Rejects hex hashes under 64 chars (common in lock files)

The `shannonEntropy()` function is exported for direct use.

### Scanner API (`src/index.ts`)

| Export | Signature | Description |
|--------|-----------|-------------|
| `scan` | `(text: string, options?: ScanOptions) => ScanResult` | Runs all 14 detectors, returns sorted detections with metadata |
| `redact` | `(text: string, detections: Detection[]) => string` | Replaces all detected values with `[TYPE_REDACTED]` placeholders (processes end-to-start to preserve offsets) |
| `getDetectors` | `() => DetectorInfo[]` | Returns metadata for all 14 registered detectors |

Filtering behavior:
- `enabledDetectors` — only run named detectors (empty = all)
- `minSeverity` — skip detections below threshold (ordered: low < medium < high < critical)
- Results always sorted by `start` position in source text

### Test Suite (`tests/`)

60 unit tests across 5 test files using Node.js built-in test runner (`node:test`):

| File | Tests | Coverage |
|------|-------|----------|
| `pii.test.ts` | 17 | Emails (simple, multiple, subdomains, plus addressing, bare domains), phones (US, UK, parentheses, short rejection), SSNs (single, multiple, non-SSN patterns), credit cards (Visa, Mastercard, Amex, invalid Luhn, wrong prefix) |
| `secrets.test.ts` | 15 | AWS access keys (valid, wrong prefix, too short), AWS secret keys (config format, colon separator), GitHub PATs (classic, fine-grained, partial), Stripe (live, test, publishable rejection), Google API (valid, too short), Google OAuth (JSON, env var), SSH keys (RSA, OpenSSH, public key rejection) |
| `tokens.test.ts` | 8 | JWTs (valid structure, random dots, two-segment), DB connection strings (PostgreSQL, MySQL, MongoDB, MongoDB+srv, HTTP URL rejection) |
| `entropy.test.ts` | 10 | Shannon entropy (empty, single char, equal distribution, high entropy), detection (secret-like strings, normal text, short strings, low diversity, hex hashes) |
| `scanner.test.ts` | 10 | Multi-type scanning, enabledDetectors filter, minSeverity filter, position sorting, metadata fields, clean text, redaction with placeholders, empty redaction |

All tests pass. Run with: `npm test`

---

## VS Code Extension (`extensions/vscode/`)

Full extension with real-time code scanning, AI prompt interception, and quick-fix redaction.

**Minimum VS Code version:** 1.93.0 (required for Language Model API and Chat Participant API)

### Document Scanning (`src/extension.ts`)

- **Real-time scanning** on every keystroke via `onDidChangeTextDocument` listener (300ms debounce)
- Scans on document open (`onDidOpenTextDocument`) and active editor change (`onDidChangeActiveTextEditor`)
- Scans all open documents on extension activation
- Skips files > 1MB for performance
- Only scans `file://` and `untitled:` URI schemes (ignores output panels, debug console)
- Clears diagnostics when documents are closed
- Re-scans all documents on configuration change

### Inline Diagnostics

- PII detections shown as **yellow warnings** (configurable via `aiRedact.piiSeverity`)
- Secrets/credentials/tokens shown as **red errors** (configurable via `aiRedact.secretSeverity`)
- Each diagnostic includes:
  - Detection type as the diagnostic code (e.g. `aws-access-key`, `email`)
  - Human-readable message (e.g. "AWS Access Key ID detected")
  - Source label: "AI Redact"
- Diagnostics collection: `ai-redact`

### AI Prompt Interception

Two interception layers that scan AI chat prompts for sensitive data before they reach models.

#### Chat Participant (`@redact`) — `src/chat-participant.ts`

- Registered as VS Code chat participant with ID `ai-redact.redact`
- Shield icon in the chat panel
- **Default behavior** (`@redact <prompt>`):
  - Scans the prompt using the core detection engine
  - If clean: forwards directly to the selected language model and streams the response
  - If sensitive data found: shows a markdown warning with grouped detection summary, offers two buttons:
    - **"Send Redacted Version"** — copies redacted prompt to clipboard
    - **"Send Original (Unsafe)"** — copies original to clipboard with a warning
- **`/scan` command** (`@redact /scan <prompt>`):
  - Scan-only mode — reports findings with severity icons and detection counts
  - Shows the redacted version in a code block
  - Does not forward to any model
- Returns `detectionCount` in the chat result metadata

#### Proxy Language Model Provider — `src/model-proxy.ts`

- Registers as a VS Code Language Model Chat Provider under the `ai-redact` vendor
- **Model discovery**: calls `vscode.lm.selectChatModels()` to find all available models (Copilot, Claude, etc.), creates a protected proxy for each one
- Proxy models appear in the chat model dropdown as **"AI Redact: [Model Name] (Protected)"**
- Skips its own models to prevent infinite proxy loops
- Refreshes proxy models when `vscode.lm.onDidChangeChatModels` fires
- **Message scanning**: iterates all messages in the request, extracts text content from `LanguageModelTextPart` instances, runs the scanner
- **Three interception modes** (configurable via `aiRedact.interceptionMode`):
  - **`warn`** (default): prepends a warning banner to the response, forwards original messages
  - **`redact`**: replaces sensitive values with `[TYPE_REDACTED]` placeholders in each message before forwarding
  - **`block`**: stops the request entirely, returns a formatted error showing what was detected
- **Forwarding**: selects the target model by ID, sends scanned/redacted messages via `model.sendRequest()`, streams response parts back via `progress.report()`
- **Token counting**: delegates to the target model's `countTokens()`, falls back to ~4 chars/token estimate
- **Logging**: all interception activity logged to "AI Redact Interceptor" output channel with timestamps
- For interception, `minSeverity` is always set to `"low"` to catch everything regardless of the diagnostic threshold

### Quick-Fix Code Actions

- `RedactCodeActionProvider` registered for all languages (`*` selector)
- Provides `QuickFix` code actions for every AI Redact diagnostic
- Action text: "Redact this [type]" (e.g. "Redact this aws access key")
- Replaces the matched range with `[TYPE_REDACTED]` placeholder
- Marked as preferred action (auto-applies with Ctrl+.)

### Commands

| Command ID | Title | Behavior |
|------------|-------|----------|
| `aiRedact.scanCurrentFile` | AI Redact: Scan Current File | Manually triggers a full scan of the active editor |
| `aiRedact.redactAll` | AI Redact: Redact All Findings in Current File | Scans, shows confirmation dialog with finding count, replaces all findings with placeholders |
| `aiRedact.toggleEnabled` | AI Redact: Toggle Scanner | Toggles `aiRedact.enabled` globally, clears/refreshes diagnostics accordingly |
| `aiRedact.chatForwardRedacted` | (internal) | Copies redacted prompt to clipboard from chat participant button |
| `aiRedact.chatForwardOriginal` | (internal) | Copies original prompt to clipboard from chat participant button |

### Status Bar

- Right-aligned status bar item (priority 100) with shield icon
- Three states:
  - **Disabled**: `$(shield) AI Redact: Off` — no background color
  - **Clean**: `$(shield) AI Redact: Clean` — no background color
  - **Findings**: `$(warning) AI Redact: N finding(s)` — warning background color (`statusBarItem.warningBackground`)
- Tooltip shows status details
- Click triggers `aiRedact.toggleEnabled`

### Configuration (`aiRedact.*` settings)

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `aiRedact.enabled` | boolean | `true` | Master on/off switch for all scanning |
| `aiRedact.scanOnType` | boolean | `true` | Scan documents as you type (vs manual only) |
| `aiRedact.minSeverity` | enum | `"medium"` | Minimum severity to report in diagnostics |
| `aiRedact.enabledDetectors` | string[] | `[]` (all) | Specific detector names to enable; empty = all active |
| `aiRedact.secretSeverity` | enum | `"error"` | VS Code diagnostic severity for secrets/credentials/tokens |
| `aiRedact.piiSeverity` | enum | `"warning"` | VS Code diagnostic severity for PII detections |
| `aiRedact.interceptionMode` | enum | `"warn"` | How the proxy model handles detected sensitive data: `warn` / `redact` / `block` |

### Extension Metadata (`package.json`)

- **Name**: `ai-redact`
- **Display name**: "AI Redact — PII & Secret Scanner for AI Assistants"
- **Publisher**: `liorahq`
- **Engine**: VS Code `^1.93.0`
- **Activation**: `onStartupFinished`
- **Categories**: Other, Linters, Programming Languages
- **Keywords**: 15 marketplace keywords targeting AI security, DLP, PII, secrets, GDPR, EU AI Act, Copilot security, data protection
- **Chat participant**: `ai-redact.redact` with `/scan` command

---

## Project Structure

```
ai-redact/
├── package.json                     # Monorepo root with npm workspaces
├── tsconfig.json                    # Shared TypeScript base config
├── .gitignore                       # Dependencies, builds, env, IDE, OS files
├── LICENSE                          # Apache 2.0
├── README.md                        # Project overview, quick start, contributing
├── documentation/
│   ├── currently-implemented.md     # This file
│   └── future-implementation.md     # Complete roadmap
├── packages/
│   └── core/
│       ├── package.json             # @ai-redact/core, zero runtime deps
│       ├── tsconfig.json            # Build config (src → dist)
│       ├── tsconfig.test.json       # Test build config (src + tests → dist-tests)
│       ├── src/
│       │   ├── index.ts             # scan(), redact(), getDetectors(), re-exports
│       │   ├── types.ts             # Detection, Detector, ScanResult, ScanOptions
│       │   └── detectors/
│       │       ├── index.ts         # Re-exports all detector modules
│       │       ├── pii.ts           # 4 PII detectors
│       │       ├── secrets.ts       # 7 secret detectors
│       │       ├── tokens.ts        # 2 token detectors
│       │       └── entropy.ts       # 1 entropy detector + shannonEntropy()
│       └── tests/
│           ├── pii.test.ts          # 17 tests
│           ├── secrets.test.ts      # 15 tests
│           ├── tokens.test.ts       # 8 tests
│           ├── entropy.test.ts      # 10 tests
│           └── scanner.test.ts      # 10 tests
├── extensions/
│   ├── vscode/
│   │   ├── package.json             # Extension manifest, contributes, chat participant
│   │   ├── tsconfig.json            # Build config (src → dist)
│   │   └── src/
│   │       ├── extension.ts         # Activation, diagnostics, quick-fix, status bar, commands
│   │       ├── chat-participant.ts  # @redact chat participant with /scan command
│   │       └── model-proxy.ts       # Proxy language model provider (warn/redact/block)
│   └── chrome/                      # Placeholder for Chrome extension
└── apps/
    └── dashboard/                   # Placeholder for team dashboard
```
