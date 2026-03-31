# Changelog

## 0.1.0 — 2026-03-31

Initial release.

### Features

- **14 detection patterns** — email, phone, SSN, credit card (Luhn), AWS keys, GitHub tokens, Stripe keys, Google API keys, Google OAuth secrets, SSH private keys, JWT tokens, database connection strings, high-entropy strings
- **Real-time code scanning** — scans as you type with 300ms debounce, yellow warnings for PII, red errors for secrets
- **Quick-fix redaction** — click the lightbulb to replace any finding with a `[TYPE_REDACTED]` placeholder
- **"Redact All" command** — replace every finding in the current file with one action
- **AI prompt interception** — proxy language model provider wraps Copilot/Claude/etc. Select "AI Redact: [Model] (Protected)" in the model dropdown
- **Three interception modes** — `warn` (default), `redact`, or `block` sensitive data in AI chat prompts
- **`@redact` chat participant** — scan prompts explicitly with `@redact` or `@redact /scan`
- **Status bar indicator** — shows finding count with warning highlight
- **Configurable** — enable/disable detectors, set severity levels, choose interception mode
