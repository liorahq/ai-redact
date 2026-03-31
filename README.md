# AI Redact

**Personal data interceptor for AI. Catches PII and secrets before they reach AI models.**

> Developers accidentally paste API keys, credentials, and personal data into ChatGPT, Copilot, Claude, and other AI tools every day. AI Redact intercepts and blocks sensitive data before it leaves your machine.

![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)
![VS Code](https://img.shields.io/badge/VS%20Code-Extension-007ACC.svg)
![Chrome](https://img.shields.io/badge/Chrome-Extension-4285F4.svg)

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

**IDE Extension** — Scans your code and intercepts AI assistant prompts in VS Code, Cursor, and Windsurf.

**Browser Extension** — Intercepts requests to ChatGPT, Claude, and Gemini before submission.

**All processing happens locally. No data ever leaves your machine.**

## Detection Patterns

| Category | What It Catches |
|----------|----------------|
| **PII** | Email addresses, phone numbers (international), Social Security Numbers, EU national IDs, credit card numbers (Luhn validated) |
| **Cloud Secrets** | AWS access keys and secret keys, Google API keys and OAuth secrets |
| **Code Secrets** | GitHub personal access tokens, Stripe API keys (live and test), private SSH keys (RSA, ED25519) |
| **Auth Tokens** | JWT tokens, database connection strings (PostgreSQL, MySQL, MongoDB) |
| **Generic** | High-entropy strings (Shannon entropy > 4.5) |

## Quick Start

### VS Code Extension

```bash
# Install from VS Code Marketplace (coming soon)
code --install-extension liorahq.ai-redact
```

Or search for **"AI Redact"** in the VS Code Extensions panel.

### Browser Extension

Chrome Web Store link coming soon.

## How It Works

```
You type code or a prompt
        │
        ▼
  ┌─────────────┐
  │  AI Redact   │  ← Scans for PII, secrets, credentials
  │  Detection   │
  │  Engine      │
  └──────┬──────┘
         │
    ┌────┴────┐
    │         │
  Clean    Sensitive
    │      detected
    ▼         │
  Sent to     ▼
  AI model  ⚠️ Warning
            Block / Redact / Allow
```

### IDE Extension Flow

1. You write code or open AI chat in your IDE
2. AI Redact scans the content in real-time
3. **Yellow warning** for PII detection
4. **Red error** for secrets and credentials
5. Quick-fix action: "Redact this value" replaces with a safe placeholder
6. AI prompt interception: scans chat messages before they reach Copilot/Cursor/Windsurf

### Browser Extension Flow

1. You type a message in ChatGPT, Claude, or Gemini
2. AI Redact intercepts the request before it's sent
3. Warning overlay appears if sensitive data is detected
4. Choose: **Block** / **Allow** / **Redact and Send**

## Project Structure

```
ai-redact/
├── packages/
│   └── core/                    # Shared detection engine (TypeScript)
│       ├── src/
│       │   ├── index.ts         # scan(), redact(), getDetectors()
│       │   ├── types.ts         # Detection, Detector, ScanResult interfaces
│       │   └── detectors/
│       │       ├── pii.ts       # Email, phone, SSN, credit card (Luhn)
│       │       ├── secrets.ts   # AWS, GitHub, Stripe, Google, SSH keys
│       │       ├── tokens.ts    # JWT, database connection strings
│       │       └── entropy.ts   # Shannon entropy detector
│       └── tests/               # 60 unit tests
├── extensions/
│   ├── vscode/                  # VS Code extension
│   │   └── src/
│   │       └── extension.ts     # Diagnostics, quick-fix, status bar
│   └── chrome/                  # Chrome browser extension (coming soon)
├── apps/
│   └── dashboard/               # Team dashboard (coming soon)
├── documentation/
│   ├── currently-implemented.md # What's built
│   └── future-implementation.md # What's planned
├── LICENSE
├── CONTRIBUTING.md
└── README.md
```

## Configuration

AI Redact is configurable through the extension settings panel:

- **Enable/disable specific detectors** — Turn off patterns you don't need
- **Set sensitivity levels** — Adjust entropy thresholds and pattern strictness
- **Custom patterns** — Add your own regex patterns for organization-specific data
- **Block vs Warn mode** — Choose whether to block or just warn on detection

## Roadmap

- [x] Core detection engine with 14 patterns (4 PII, 7 secrets, 2 tokens, 1 entropy)
- [x] VS Code extension with real-time scanning, inline diagnostics, quick-fix redaction
- [x] Status bar indicator with finding count
- [x] Configuration panel (enable/disable detectors, severity levels, scan-on-type toggle)
- [x] 60 unit tests covering true positives, true negatives, and edge cases
- [ ] AI prompt interception (Copilot, Cursor, Windsurf)
- [ ] OAuth registration flow (GitHub + Google)
- [ ] Chrome browser extension (ChatGPT, Claude, Gemini)
- [ ] Firefox browser extension
- [ ] JetBrains plugin
- [ ] Neovim plugin
- [ ] CLI tool
- [ ] Team dashboard with aggregate findings
- [ ] EU AI Act compliance evidence mapping
- [ ] Enhanced NLP detection via Presidio sidecar

See [documentation/currently-implemented.md](documentation/currently-implemented.md) for full details on what's built, and [documentation/future-implementation.md](documentation/future-implementation.md) for the complete roadmap.

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on:

- Adding new detection patterns
- Improving existing detectors
- Building extensions for new platforms
- Reporting bugs and suggesting features

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