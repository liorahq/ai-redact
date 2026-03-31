# Future Implementation

Roadmap of features not yet built, organized by priority and phase.

Last updated: 2026-03-31

---

## What's Already Done

The following are fully implemented (see `currently-implemented.md` for details):

- Core detection engine with 14 patterns (4 PII, 7 secrets, 2 tokens, 1 entropy)
- VS Code extension with real-time code scanning, inline diagnostics, quick-fix redaction
- AI prompt interception via proxy language model provider (warn/redact/block modes)
- `@redact` chat participant with `/scan` command
- Status bar indicator, configuration panel, 60 unit tests
- Monorepo infrastructure with npm workspaces

---

## Phase 1 Remaining — VS Code Extension Completion

### Additional Detection Patterns

Patterns to add to `packages/core/src/detectors/`:

**High priority (commonly leaked to AI tools):**
- Azure connection strings
- Slack webhook URLs (`https://hooks.slack.com/...`)
- Twilio API keys (`SK` prefix)
- SendGrid API keys (`SG.` prefix)
- Mailgun API keys
- Heroku API keys
- DigitalOcean API tokens

**Medium priority (broader PII coverage):**
- IP addresses (IPv4 and IPv6)
- IBAN numbers (international bank account)
- EU national ID patterns (German, French, Spanish, Italian, etc.)
- Passport numbers (country-specific formats)
- Date of birth patterns

**Lower priority (nice to have):**
- Datadog API keys
- Twitch OAuth tokens
- Discord bot tokens
- NPM tokens
- PyPI tokens

### Extension Polish for Marketplace Launch

- Demo GIF (30 seconds) showing a secret being caught and redacted
- Extension icon and marketplace banner
- VS Code publisher verification (only 4% of publishers have it)
- Changelog file
- README optimized for marketplace display (different from GitHub README)

---

## Phase 2 — Browser Extension (Weeks 5-6)

### Chrome Extension (Manifest V3)

- MAIN world content script injected at `document_start`
- Override `window.fetch` to intercept API requests to:
  - `chat.openai.com`
  - `claude.ai`
  - `gemini.google.com`
- Scan request bodies for PII/secrets before submission
- Warning overlay UI with three options:
  - **Block** — prevent the request
  - **Allow** — send original
  - **Redact and Send** — replace sensitive values and send
- Popup UI showing:
  - Scan history (last N findings)
  - Settings (enable/disable detectors, sensitivity)
  - Sign-in button (same account as IDE extension)
- Detection engine reused from `packages/core/` (bundled into extension)

### Firefox Extension

- Same codebase as Chrome with minor manifest differences
- Manifest V2/V3 compatibility layer where needed
- Firefox Add-ons store listing

---

## Phase 3 — Team Dashboard Backend (Weeks 7-10)

### Authentication Service

- OAuth flow connecting extension auth to web app sessions
- GitHub OAuth + Google OAuth
- Shared account across IDE extension and browser extension
- Token stored in VS Code `SecretStorage` API (encrypted)
- Account creation captures: email, name, GitHub username, company

### Anonymous Mode + Registration Upgrade

- Extension works in anonymous mode for first 24 hours or 50 scans
- After threshold: soft prompt to sign in (non-blocking)
- Registration unlocks: unlimited scans, personal findings history, weekly email digest
- Captured data feeds sales pipeline (company domain clustering, CRM enrichment)

### API Endpoints

- Receive anonymized scan metadata from extensions
  - Finding type, timestamp, file type, severity — never actual content
- Rate limiting and abuse prevention
- Account creation endpoint
- Scan statistics aggregation

### Team Dashboard (Next.js + Supabase)

- Aggregate findings across team members
- Trend charts: PII leaks per week, secrets detected per developer
- Policy management: custom rules, block vs warn, allowed patterns
- Audit log: who detected what, when, what action was taken

### Integrations

- Slack notifications for high-severity findings
- Microsoft Teams notifications
- Stripe billing integration for per-seat pricing

### Upgrade Prompts in Extension (Non-Intrusive)

- Status bar: "3 team members using AI Redact → Unlock team dashboard"
- After high-severity finding: "This would trigger an EU AI Act Article 15 alert. Learn more →"
- Settings panel: Team/Enterprise feature badges with upgrade links
- Never modal popups, never blocking the coding flow

---

## Phase 4 — Platform Expansion (Months 7-9)

### JetBrains Plugin

- Kotlin implementation
- ACP (AI Chat Protocol) for AI agent interception
- Same detection engine via bundled JS runtime or Kotlin port
- IntelliJ, WebStorm, PyCharm support

### Neovim Plugin

- Lua implementation
- `CopilotChat.nvim` `prepare_input` hooks for AI interception
- Display findings via Neovim diagnostics API

### CLI Tool

- `ai-redact scan <file>` — scan a file and report findings
- `ai-redact wrap -- <command>` — intercept stdin/stdout of AI CLI tools
- CI/CD integration: pre-commit hooks, GitHub Actions
- Exit codes for CI: 0 = clean, 1 = findings above threshold

### Enhanced Detection via Presidio Sidecar

- Docker container running Microsoft Presidio
- 30+ entity types including NLP-based detection (names, addresses, etc.)
- Fallback to local regex engine when sidecar unavailable
- Configurable via extension settings

---

## EU AI Act Compliance SaaS (Product 2 — Proprietary)

### Risk Classification Engine (Weeks 7-9)

- Interactive Annex III classification wizard
  - 8 high-risk use-case domains: biometrics, critical infrastructure, education, employment, essential services, law enforcement, migration, justice
  - Article 6(3) exceptions (narrow procedural tasks, human activity improvements)
  - Rationale capture for each classification decision
  - PDF export of risk classification report
- Annex II check: AI embedded in regulated products (medical devices, vehicles)
- Prohibited practices checker (Article 5): social scoring, real-time biometric ID
- Limited risk obligations checker (Article 50): transparency for chatbots, deepfakes
- Risk level dashboard for all registered AI systems

### Documentation Generator (Weeks 10-12)

- Annex IV technical documentation builder (simplified SME version)
  - 9 sections: general description, development process, monitoring, risk management, lifecycle changes, harmonized standards, declaration of conformity, post-market monitoring, cybersecurity
- Field-level completeness validation with % complete per section
- Version control for documentation changes
- Collaborative editing for multiple team members
- PDF and DOCX export with professional formatting

### Conformity Assessment Workflow (Weeks 13-16)

- Self-assessment workflow (Annex VI) with step-by-step checklists
- Declaration of Conformity generator (Article 47)
- Risk management system (Article 9): risk register, mitigation tracking, residual risk docs
- Article 12 logging requirements checklist (retention periods, tamper resistance)
- Article 72 post-market monitoring plan template
- Article 73 incident reporting templates with deadline tracking:
  - 15-day deadline for serious incidents
  - 10-day deadline for death-related incidents
  - 2-day deadline for widespread infringements

### DLP Integration Bridge (Weeks 17-20)

- Connect IDE extension findings to compliance dashboard
  - DLP scans → Article 15 (cybersecurity) evidence
  - PII in training data → Article 10 (data governance) evidence
  - Clean scans → ongoing compliance evidence
- Automated evidence collection from extension metadata
- Control status auto-updates (green/yellow/red)
- Compliance score improving as DLP issues are remediated
- Auditor portal: read-only view for external assessors

### Enterprise Features (Months 6-9)

- Multi-user organizations with role-based access (RBAC)
- SSO (SAML/OIDC) integration
- Cross-framework mapping: EU AI Act ↔ GDPR ↔ ISO 42001 ↔ NIS2
- API for GRC platform integration
- Custom policy rules and organization-wide settings
- Audit trail export for compliance documentation

---

## Marketing & Growth (Not Code)

### Pre-Launch

- Demo GIF for README and marketplace listing
- Seed 50-100 GitHub stars from personal network
- Create Discord server for community support
- VS Code publisher verification

### Launch

- Hacker News "Show HN" post (Monday-Wednesday, 8-10am ET)
- Reddit r/programming, r/vscode, r/netsec, r/cybersecurity
- Dev.to article: "I accidentally leaked my AWS keys to ChatGPT — so I built this"
- Twitter/X thread with demo video
- LinkedIn post targeting CISOs and compliance professionals

### Growth Engine

- Good Samaritan scanner: find exposed AI API keys on GitHub, notify developers
- VS Code Marketplace SEO (keyword-rich displayName, 30 keywords in package.json)
- Monthly "State of AI Data Leakage" mini-reports from scanning data
- Newsjack every AI data breach with rapid analysis posts

### Compliance SaaS Marketing

- Free EU AI Act risk classification wizard on landing page (lead magnet)
- "EU AI Act Compliance Checklist 2026" downloadable PDF (gated)
- "EU AI Act Fines Calculator" interactive tool (ungated)
- LinkedIn content strategy (3 posts/week: educational, engagement, conversion)
- GDPR consultancy partnerships (15-20% referral commission)
- Privacy law firm partnerships (15% commission + 10% client discount)
- IAPP membership and conference attendance
- Deadline-driven urgency campaigns before August 2, 2026

---

## Pricing (Planned)

### IDE Extension

| Tier | Price | Key Features |
|------|-------|-------------|
| Free | $0 | 14 patterns, local-only, 500 scans/month, basic alerts |
| Team | $12/dev/month | Unlimited scans, team dashboard, custom policies, Slack alerts, audit logs |
| Enterprise | $22/dev/month | SSO, RBAC, compliance reporting, API, policy enforcement, dedicated support |

### EU AI Act Compliance SaaS

| Tier | Price | Key Features |
|------|-------|-------------|
| Starter | €199/month | 1 AI system, risk classifier, basic checklists, documentation templates |
| Growth | €499/month | 10 systems, full Annex IV builder, conformity workflow, DLP integration |
| Scale | €1,250/month | 50 systems, multi-user, API, audit trail, cross-framework mapping |
| Enterprise | Custom | Unlimited, SSO, custom frameworks, dedicated CSM, auditor portal |

### Bundle

- Growth compliance plan includes Team IDE extension for up to 10 developers
- Scale compliance plan includes Team IDE extension for up to 25 developers

---

## Timeline

| Period | Milestone | Status |
|--------|-----------|--------|
| Weeks 1-4 | VS Code extension MVP — core engine, extension, AI interception | **Done** |
| Weeks 5-6 | Browser extension + public launch | Upcoming |
| Weeks 7-10 | Team dashboard + compliance MVP start | Planned |
| Weeks 11-14 | Compliance SaaS MVP | Planned |
| Weeks 15-16 | DLP-compliance bridge | Planned |
| Weeks 17-20 | Platform expansion (JetBrains, Neovim, Firefox) | Planned |
| Weeks 21-26 | Enterprise features + partnerships | Planned |
