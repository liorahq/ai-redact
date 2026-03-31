# AI Redact

**Personal data interceptor for AI. Catches PII and secrets before they reach AI models.**

> Developers accidentally paste API keys, credentials, and personal data into ChatGPT, Copilot, Claude, and other AI tools every day. AI Redact intercepts and blocks sensitive data before it leaves your machine.

![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)
![VS Code](https://img.shields.io/badge/VS%20Code-Extension-007ACC.svg)
![Tests](https://img.shields.io/badge/tests-73%20passing-brightgreen.svg)
![CLI](https://img.shields.io/badge/CLI-Available-green.svg)

<!-- TODO: Add 30-second demo GIF here -->
<!-- ![Demo](docs/assets/demo.gif) -->

---

## The Problem

- **81% surge** in AI-service credential leaks in the past year ([GitGuardian Report](https://www.gitguardian.com/))
- Developers copy-paste secrets into AI chat interfaces without thinking
- AI coding assistants send code context — including hardcoded credentials — to cloud APIs
- One leaked AWS key can cost thousands of dollars in minutes
- PII in AI prompts creates GDPR, EU AI Act, and compliance exposure

## What AI Redact Does

AI Redact sits between you and your AI tools. It scans everything before it reaches the model and blocks or warns when it detects sensitive data.

**Real-time Code Scanning** — Scans your code as you type. Yellow warnings for PII, red errors for secrets. Quick-fix actions to redact with one click.

**AI Prompt Interception** — Proxy model provider wraps Copilot, Claude, and other models. Select "AI Redact: GPT-4o (Protected)" in the model dropdown and every message is scanned before it reaches the AI. `@redact` chat participant for explicit prompt scanning.

**CLI Tool** — Scan files, pipe stdin, or integrate with Claude Code hooks. `ai-redact scan --hook --stdin` blocks prompts containing secrets before they reach Claude.

**Browser Extension** (coming soon) — Intercepts requests to ChatGPT, Claude, and Gemini before submission.

**All processing happens locally. No data ever leaves your machine.**

## Detection Patterns

14 detection patterns across 4 categories:

| Category | What It Catches | Severity |
|----------|----------------|----------|
| **PII** | Email addresses (RFC 5322), international phone numbers, Social Security Numbers, credit card numbers (Luhn validated) | medium-high |
| **Cloud Secrets** | AWS access keys and secret keys, Google API keys, Google OAuth secrets | high-critical |
| **Code Secrets** | GitHub PATs (classic + fine-grained), Stripe API keys (live + test), private SSH keys (RSA, ED25519, EC, DSA, OpenSSH) | critical |
| **Auth Tokens** | JWT tokens (3-part base64url), database connection strings (PostgreSQL, MySQL, MongoDB) | high-critical |
| **Generic** | High-entropy strings (Shannon entropy > 4.5) with false positive filtering | medium |

## Quick Start

### VS Code Extension

```bash
# Install from VS Code Marketplace
code --install-extension liorahq.ai-redact
```

Or search for **"AI Redact"** in the VS Code Extensions panel.

### CLI Tool

```bash
# Scan a file
ai-redact scan config.yml

# Pipe text
echo "key = AKIAIOSFODNN7EXAMPLE" | ai-redact scan

# Redact output
cat secrets.env | ai-redact scan --redact > clean.env

# JSON output for CI/CD
ai-redact scan --json src/*.ts
```

### Claude Code Integration

Add to `.claude/settings.json` to block prompts containing secrets:

```json
{
  "hooks": {
    "UserPromptSubmit": [{
      "type": "command",
      "command": "ai-redact scan --hook --stdin",
      "timeout": 5
    }]
  }
}
```

See [documentation/claude-code-hook-setup.md](documentation/claude-code-hook-setup.md) for full setup guide.

### Using the AI Prompt Interceptor

1. Open VS Code Chat (Copilot, Cursor, or Windsurf)
2. Switch the model dropdown to **"AI Redact: [Model] (Protected)"**
3. Chat normally — AI Redact scans every message before it reaches the model
4. Sensitive data is warned, redacted, or blocked based on your settings

Or use the chat participant directly:

```
@redact Explain this code: const key = "AKIAIOSFODNN7EXAMPLE"
@redact /scan Check this for secrets: sk_live_4eC39HqLyjWDarjtT1zdp7dc
```

## How It Works

```
You type code or a prompt
        |
        v
  +-------------+
  |  AI Redact   |  <-- Scans for PII, secrets, credentials
  |  Detection   |
  |  Engine      |
  +------+------+
         |
    +----+----+
    |         |
  Clean    Sensitive
    |      detected
    v         |
  Sent to     v
  AI model  Warning / Redact / Block
```

### Code Scanning

1. You write code or open a file in your IDE
2. AI Redact scans the content in real-time (300ms debounce)
3. **Yellow warning** for PII detection (email, phone, SSN, credit card)
4. **Red error** for secrets and credentials (AWS keys, GitHub tokens, etc.)
5. Quick-fix action: click the lightbulb to "Redact this value" with a placeholder
6. "Redact All" command replaces every finding in the file at once

### AI Prompt Interception

1. You select a protected proxy model in the chat dropdown
2. AI Redact intercepts every message before it reaches the underlying model
3. Based on `aiRedact.interceptionMode`:
   - **warn** (default) — shows a banner, forwards the original prompt
   - **redact** — replaces sensitive values with `[TYPE_REDACTED]` before forwarding
   - **block** — stops the request entirely, shows what was detected

## Configuration

All settings are under `aiRedact.*` in VS Code Settings:

| Setting | Default | Description |
|---------|---------|-------------|
| `enabled` | `true` | Master on/off switch |
| `scanOnType` | `true` | Scan documents as you type |
| `minSeverity` | `"medium"` | Minimum severity to report (`low` / `medium` / `high` / `critical`) |
| `enabledDetectors` | `[]` (all) | Specific detector names to enable |
| `secretSeverity` | `"error"` | Diagnostic severity for secrets (red squiggle) |
| `piiSeverity` | `"warning"` | Diagnostic severity for PII (yellow squiggle) |
| `interceptionMode` | `"warn"` | How the proxy model handles sensitive data: `warn` / `redact` / `block` |

## Commands

| Command | Description |
|---------|-------------|
| `AI Redact: Scan Current File` | Manually trigger a full scan |
| `AI Redact: Redact All Findings in Current File` | Replace all findings with placeholders |
| `AI Redact: Toggle Scanner` | Enable or disable scanning (also via status bar click) |

## Project Structure

```
ai-redact/
├── packages/
│   ├── core/                        # Shared detection engine (TypeScript)
│   │   ├── src/
│   │   │   ├── index.ts             # scan(), redact(), getDetectors()
│   │   │   ├── types.ts             # Detection, Detector, ScanResult interfaces
│   │   │   └── detectors/
│   │   │       ├── pii.ts           # Email, phone, SSN, credit card (Luhn)
│   │   │       ├── secrets.ts       # AWS, GitHub, Stripe, Google, SSH keys
│   │   │       ├── tokens.ts        # JWT, database connection strings
│   │   │       └── entropy.ts       # Shannon entropy detector
│   │   └── tests/                   # 60 unit tests
│   └── cli/                         # CLI tool
│       └── src/
│           └── index.ts             # ai-redact scan, --hook, --redact, --json
├── extensions/
│   ├── vscode/                      # VS Code extension
│   │   └── src/
│   │       ├── extension.ts         # Diagnostics, quick-fix, status bar
│   │       ├── chat-participant.ts  # @redact chat participant
│   │       └── model-proxy.ts       # Proxy language model provider
│   └── chrome/                      # Chrome browser extension (coming soon)
├── apps/
│   └── dashboard/                   # Team dashboard (coming soon)
├── documentation/
│   ├── currently-implemented.md     # What's built
│   ├── future-implementation.md     # What's planned
│   └── claude-code-hook-setup.md    # Claude Code integration guide
├── LICENSE                          # Apache 2.0
└── README.md
```

## Roadmap

- [x] Core detection engine with 14 patterns (4 PII, 7 secrets, 2 tokens, 1 entropy)
- [x] VS Code extension with real-time scanning, inline diagnostics, quick-fix redaction
- [x] AI prompt interception — proxy model provider + @redact chat participant (warn/redact/block)
- [x] Status bar indicator with finding count
- [x] Configuration panel (enable/disable detectors, severity levels, interception mode)
- [x] 73 unit tests covering true positives, true negatives, and edge cases
- [x] CLI tool with scan, redact, JSON output, and hook mode
- [x] Claude Code integration via UserPromptSubmit hooks
- [ ] Chrome browser extension (ChatGPT, Claude, Gemini)
- [ ] Firefox browser extension
- [ ] JetBrains plugin
- [ ] Neovim plugin
- [ ] Team dashboard with aggregate findings
- [ ] EU AI Act compliance evidence mapping
- [ ] Enhanced NLP detection via Presidio sidecar

See [documentation/currently-implemented.md](documentation/currently-implemented.md) for full technical details on what's built, and [documentation/future-implementation.md](documentation/future-implementation.md) for the complete roadmap.

## Contributing

We welcome contributions! The easiest way to contribute is adding a new detection pattern.

Each detector is a function matching this interface:

```typescript
type Detector = (text: string) => Detection[];

interface Detection {
  type: string;        // e.g. "aws-secret-key", "email"
  category: "pii" | "secret" | "credential" | "token";
  severity: "low" | "medium" | "high" | "critical";
  start: number;       // character offset
  end: number;         // character offset
  message: string;     // human-readable description
}
```

**Good first patterns to add:** Azure connection strings, Slack webhook URLs, Twilio API keys, IP addresses (IPv4/IPv6), IBAN numbers.

### Development Setup

```bash
git clone https://github.com/liorahq/ai-redact.git
cd ai-redact
npm install
npm run build
npm test          # 60 tests, all passing
```

To run the VS Code extension locally:

```bash
cd extensions/vscode
npm run compile
# Press F5 in VS Code to launch the Extension Development Host
```

### Code Guidelines

- **TypeScript** for all new code
- **No external dependencies** in the core detection engine
- **Tests required** for all detection patterns (true positives + true negatives)
- **One pattern per PR** when adding new detectors

## Privacy

AI Redact processes everything locally. The free tier sends **zero data** off your machine. The team tier sends only anonymized metadata (finding type, severity, timestamp) — never actual code, secrets, or PII content.

## License

[Apache 2.0](LICENSE) — Free to use, modify, and distribute.

## Links

- [Website](https://lioraengine.com) (coming soon)
- [VS Code Marketplace](https://marketplace.visualstudio.com/) (coming soon)
- [Discord Community](https://discord.gg/) (coming soon)
- [Report a Bug](https://github.com/liorahq/ai-redact/issues)

---

**Built by [Liora HQ](https://github.com/liorahq)** — AI-powered security and compliance tools.
