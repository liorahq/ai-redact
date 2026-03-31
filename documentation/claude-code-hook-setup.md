# Claude Code Hook Setup

AI Redact can intercept prompts sent to Claude Code by using Claude Code's built-in hooks system.

## How It Works

Claude Code supports `UserPromptSubmit` hooks — shell commands that run before every prompt is sent to Claude. If the hook exits with code 2, the request is blocked.

AI Redact's CLI tool (`ai-redact scan --hook --stdin`) reads the prompt from stdin, scans it for PII and secrets, and exits with:
- **Exit 0** — clean, prompt is sent normally
- **Exit 2** — sensitive data detected, prompt is blocked

## Automatic Setup (Recommended)

If you have both the AI Redact VS Code extension and the Claude Code extension installed, AI Redact will **automatically detect Claude Code** and offer to enable the hook with a single click.

1. Install AI Redact from the VS Code Marketplace
2. When the extension activates, it detects Claude Code and shows a notification
3. Click **"Enable"** — done

You can also trigger this manually anytime:
- `Cmd+Shift+P` → **"AI Redact: Enable Claude Code Integration"**
- To remove: `Cmd+Shift+P` → **"AI Redact: Disable Claude Code Integration"**

## Manual Setup

### 1. Install the CLI

```bash
# From the monorepo (development)
cd packages/cli && npm run build

# Or globally (once published to npm)
npm install -g @ai-redact/cli
```

### 2. Configure the Hook

Add the following to your Claude Code settings file:

**Project-level** (`.claude/settings.json` in your repo):

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "type": "command",
        "command": "ai-redact scan --hook --stdin",
        "timeout": 5
      }
    ]
  }
}
```

**User-level** (`~/.claude/settings.json` for all projects):

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "type": "command",
        "command": "ai-redact scan --hook --stdin",
        "timeout": 5
      }
    ]
  }
}
```

### 3. Test It

Open Claude Code and try sending a prompt containing a test secret:

```
Explain this code: const key = "AKIAIOSFODNN7EXAMPLE"
```

The hook should block the request and show a warning.

## Modes

### Block Mode (Default with `--hook`)

Blocks the request entirely when sensitive data is found.

```json
{
  "command": "ai-redact scan --hook --stdin",
  "timeout": 5
}
```

### Warn Mode (Non-Blocking)

Scans and logs findings but allows the request through. Use without `--hook` — the scan runs but exit code 1 doesn't block Claude Code (only exit code 2 blocks).

```json
{
  "command": "ai-redact scan --stdin --quiet || true",
  "timeout": 5
}
```

### Redact Mode

Outputs the redacted version of the prompt. Note: Claude Code hooks cannot currently modify the prompt text, so this is useful for logging purposes.

```json
{
  "command": "ai-redact scan --stdin --redact >> /tmp/ai-redact-log.txt || true",
  "timeout": 5
}
```

## Options

| Flag | Description |
|------|-------------|
| `--hook` | Exit code 2 on findings (blocks Claude Code) |
| `--stdin` | Read prompt from stdin |
| `--quiet` | Suppress output |
| `--json` | Output findings as JSON |
| `--min-severity LVL` | Only flag findings at or above: `low`, `medium`, `high`, `critical` |
| `--detectors LIST` | Comma-separated detector names to enable |

## Example: Only Block on Critical Secrets

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "type": "command",
        "command": "ai-redact scan --hook --stdin --min-severity critical",
        "timeout": 5
      }
    ]
  }
}
```

This allows PII (emails, phones) through but blocks AWS keys, SSH keys, database connection strings, and other critical secrets.
