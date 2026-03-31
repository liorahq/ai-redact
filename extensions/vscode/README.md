# AI Redact — Catch Secrets Before AI

**Scans your code and intercepts AI chat prompts for PII, secrets, and credentials before they reach any AI model.**

Developers accidentally paste API keys, credentials, and personal data into Copilot, ChatGPT, Claude, and other AI tools every day. AI Redact catches it before it leaves your machine.

<!-- TODO: ![Demo](https://raw.githubusercontent.com/liorahq/ai-redact/main/docs/assets/demo.gif) -->

## Features

### Real-Time Code Scanning

AI Redact scans your code as you type:

- **Yellow warnings** for PII (emails, phone numbers, SSNs, credit cards)
- **Red errors** for secrets (AWS keys, GitHub tokens, Stripe keys, SSH keys)
- **Quick-fix actions** — click the lightbulb to redact any finding with one click
- **"Redact All" command** — replace every finding in a file at once

### AI Prompt Interception

AI Redact wraps your AI models with a protective proxy:

1. Open the model dropdown in VS Code Chat
2. Select **"AI Redact: [Model] (Protected)"**
3. Chat normally — every message is scanned before it reaches the AI
4. Sensitive data is warned, redacted, or blocked based on your settings

Three interception modes:

| Mode | Behavior |
|------|----------|
| **warn** (default) | Shows a warning banner, forwards the original prompt |
| **redact** | Replaces sensitive values with `[TYPE_REDACTED]` before forwarding |
| **block** | Stops the request entirely, shows what was detected |

### @redact Chat Participant

Use `@redact` in Copilot Chat for explicit prompt scanning:

```
@redact Explain this code: const key = "AKIA..."
@redact /scan Check this for secrets before I send it
```

## 14 Detection Patterns

| Category | Detectors |
|----------|-----------|
| **PII** | Email addresses, international phone numbers, Social Security Numbers, credit card numbers (Luhn validated) |
| **Secrets** | AWS access keys, AWS secret keys, GitHub PATs, Stripe API keys, Google API keys, Google OAuth secrets, SSH private keys |
| **Tokens** | JWT tokens, database connection strings (PostgreSQL, MySQL, MongoDB) |
| **Generic** | High-entropy strings (Shannon entropy > 4.5) |

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `aiRedact.enabled` | `true` | Master on/off switch |
| `aiRedact.scanOnType` | `true` | Scan as you type |
| `aiRedact.minSeverity` | `"medium"` | Minimum severity: `low` / `medium` / `high` / `critical` |
| `aiRedact.enabledDetectors` | `[]` (all) | Specific detectors to enable |
| `aiRedact.secretSeverity` | `"error"` | Red squiggle for secrets |
| `aiRedact.piiSeverity` | `"warning"` | Yellow squiggle for PII |
| `aiRedact.interceptionMode` | `"warn"` | Proxy mode: `warn` / `redact` / `block` |

## Commands

- **AI Redact: Scan Current File** — manually trigger a scan
- **AI Redact: Redact All Findings in Current File** — replace all findings with placeholders
- **AI Redact: Toggle Scanner** — enable/disable (also via status bar click)

## Claude Code Integration

AI Redact includes a CLI tool that integrates with Claude Code's hook system. Add to `.claude/settings.json`:

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

This blocks any prompt containing secrets before it reaches Claude.

## Privacy

All processing happens locally. **Zero data leaves your machine.** No telemetry, no cloud calls, no data collection.

## Open Source

[Apache 2.0 License](https://github.com/liorahq/ai-redact) — free to use, modify, and distribute.

**Built by [Liora HQ](https://github.com/liorahq)**
