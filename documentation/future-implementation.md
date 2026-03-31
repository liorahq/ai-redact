# Future Implementation

Roadmap of features not yet built, organized by priority and phase.

---

## Phase 1 Remaining — VS Code Extension Completion

### AI Prompt Interception

- Register as proxy model provider via VS Code Language Model Chat Provider API
- Intercept all chat requests before forwarding to Copilot / Cursor / Windsurf
- Block or warn before sensitive data reaches the LLM
- This is the core differentiator — scanning code is table stakes, intercepting AI prompts is the value

### Registration & Authentication Flow

- **Anonymous mode**: first 24 hours or 50 scans with no login required
- **OAuth login**: GitHub OAuth + Google OAuth
  - Browser opens consent screen, redirects back with token
  - Token stored in VS Code `SecretStorage` API (encrypted)
  - Account created on backend: email, name, GitHub username, company
- **Post-registration unlocks**: unlimited scans, personal findings history, weekly email digest
- **Telemetry**: aggregate scan statistics (finding counts by type, never actual content)
- **Upgrade prompts** (non-intrusive, never modal):
  - Status bar: "3 team members using AI Redact → Unlock team dashboard"
  - After high-severity finding: "This would trigger an EU AI Act Article 15 alert. Learn more →"
  - Settings panel: Team/Enterprise feature badges with upgrade links

### Additional Detection Patterns

These patterns are defined in CONTRIBUTING.md as good first contributions:

- Azure connection strings
- Slack webhook URLs
- Twilio API keys
- Mailgun API keys
- SendGrid API keys
- Heroku API keys
- DigitalOcean API tokens
- IP addresses (IPv4 and IPv6)
- IBAN numbers
- Passport numbers (country-specific)
- EU national ID patterns (beyond US SSN)

---

## Phase 2 — Browser Extension (Weeks 5-6)

### Chrome Extension (Manifest V3)

- MAIN world content script injected at `document_start`
- Override `window.fetch` to intercept API requests to `chat.openai.com`, `claude.ai`, `gemini.google.com`
- Scan request bodies for PII/secrets before submission
- Warning overlay with "Block" / "Allow" / "Redact and Send" options
- Popup UI showing scan history and settings
- Same OAuth login flow as VS Code extension (shared auth backend)
- Detection engine reused from `packages/core/`

### Firefox Extension

- Same codebase as Chrome with minor manifest differences
- Manifest V2/V3 compatibility layer

---

## Phase 3 — Team Dashboard Backend (Weeks 7-10)

### Authentication Service

- OAuth flow connecting extension auth to web app sessions
- Shared account across IDE extension and browser extension

### API Endpoints

- Receive anonymized scan metadata from extensions
- Finding type, timestamp, file type, severity — never actual content
- Rate limiting and abuse prevention

### Team Dashboard (Next.js + Supabase)

- Aggregate findings across team members
- Trend charts: PII leaks per week, secrets detected per developer
- Policy management: custom rules, block vs warn, allowed patterns
- Audit log: who detected what, when, what action was taken

### Integrations

- Slack notifications for high-severity findings
- Microsoft Teams notifications
- Stripe billing integration for per-seat pricing

---

## Phase 4 — Platform Expansion (Months 7-9)

### JetBrains Plugin

- Kotlin implementation
- ACP (AI Chat Protocol) for AI agent interception
- Same detection engine via bundled JS runtime or Kotlin port

### Neovim Plugin

- Lua implementation
- `CopilotChat.nvim` `prepare_input` hooks for AI interception
- Display findings via Neovim diagnostics API

### CLI Tool

- Wraps AI commands, scans stdin/stdout via Unix pipes
- `ai-redact scan <file>` for explicit scanning
- `ai-redact wrap -- <command>` to intercept AI CLI tools
- CI/CD integration for pre-commit hooks

### Enhanced Detection via Presidio Sidecar

- Docker container running Microsoft Presidio
- 30+ entity types including NLP-based detection
- Fallback to local regex engine when sidecar unavailable

---

## EU AI Act Compliance SaaS (Product 2 — Proprietary)

### Risk Classification Engine (Weeks 7-9)

- Interactive Annex III classification wizard
  - 8 high-risk use-case domains (biometrics, critical infrastructure, education, employment, essential services, law enforcement, migration, justice)
  - Article 6(3) exceptions
  - Rationale capture for each classification decision
  - PDF export of risk classification report
- Annex II check: AI embedded in regulated products
- Prohibited practices checker (Article 5): social scoring, real-time biometric ID
- Limited risk obligations checker (Article 50): transparency for chatbots, deepfakes
- Risk level dashboard for all registered AI systems

### Documentation Generator (Weeks 10-12)

- Annex IV technical documentation builder (simplified SME version)
  - 9 sections: general description, development process, monitoring, risk management, lifecycle changes, harmonized standards, declaration of conformity, post-market monitoring, cybersecurity
- Field-level completeness validation with % complete per section
- Version control for documentation changes
- Collaborative editing for multiple team members
- PDF and DOCX export

### Conformity Assessment Workflow (Weeks 13-16)

- Self-assessment workflow (Annex VI) with step-by-step checklists
- Declaration of Conformity generator (Article 47)
- Risk management system (Article 9): risk register, mitigation tracking, residual risk docs
- Article 12 logging requirements checklist
- Article 72 post-market monitoring plan template
- Article 73 incident reporting templates with deadline tracking (15-day, 10-day, 2-day)

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

- Multi-user organizations with role-based access
- SSO (SAML/OIDC) integration
- Cross-framework mapping: EU AI Act ↔ GDPR ↔ ISO 42001 ↔ NIS2
- API for GRC platform integration
- Custom policy rules and organization-wide settings
- Audit trail export

---

## Marketing & Growth (Not Code)

### Pre-Launch

- Polish README with 30-second demo GIF
- Seed GitHub stars from network
- Create Discord server
- VS Code publisher verification

### Launch

- Hacker News "Show HN" post
- Reddit, Dev.to, Twitter/X, LinkedIn posts
- Launch blog post

### Growth Engine

- Good Samaritan scanner: find exposed AI API keys on GitHub, notify developers
- VS Code Marketplace SEO optimization
- Monthly "State of AI Data Leakage" reports
- Newsjack AI data breaches

### Compliance SaaS Marketing

- Free EU AI Act risk classification wizard as lead magnet
- Downloadable compliance checklist PDF
- Fines calculator interactive tool
- LinkedIn content strategy (3 posts/week)
- GDPR consultancy partnerships (15-20% referral commission)
- IAPP membership and events
- Deadline-driven urgency campaigns before August 2, 2026

---

## Pricing (Planned)

### IDE Extension

| Tier | Price | Key Features |
|------|-------|-------------|
| Free | $0 | 12+ patterns, local-only, 500 scans/month |
| Team | $12/dev/month | Unlimited scans, team dashboard, custom policies, Slack alerts |
| Enterprise | $22/dev/month | SSO, RBAC, compliance reporting, API, dedicated support |

### EU AI Act Compliance SaaS

| Tier | Price | Key Features |
|------|-------|-------------|
| Starter | €199/month | 1 AI system, risk classifier, basic checklists |
| Growth | €499/month | 10 systems, full Annex IV builder, DLP integration |
| Scale | €1,250/month | 50 systems, multi-user, API, cross-framework mapping |
| Enterprise | Custom | Unlimited, SSO, dedicated CSM, auditor portal |

---

## Timeline

| Period | Milestone |
|--------|-----------|
| Weeks 1-4 | VS Code extension MVP (current phase — core engine and extension done) |
| Weeks 5-6 | Browser extension + public launch |
| Weeks 7-10 | Team dashboard + compliance MVP start |
| Weeks 11-14 | Compliance SaaS MVP |
| Weeks 15-16 | DLP-compliance bridge |
| Weeks 17-20 | Platform expansion (JetBrains, Neovim, Firefox) |
| Weeks 21-26 | Enterprise features + partnerships |
