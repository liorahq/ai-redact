import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const CLAUDE_CODE_EXTENSION_ID = "anthropic.claude-code";
const HOOK_MARKER = "ai-redact";
const PROMPTED_KEY = "aiRedact.claudeCodeHookPrompted";

/**
 * Detects Claude Code extension and offers to install the UserPromptSubmit hook
 * that scans prompts for PII/secrets before they reach Claude.
 */
export function offerClaudeCodeHook(context: vscode.ExtensionContext): void {
  // Check if Claude Code is installed
  const claudeCode = vscode.extensions.getExtension(CLAUDE_CODE_EXTENSION_ID);
  if (!claudeCode) return;

  // Only prompt once per install (user can re-trigger via command)
  const alreadyPrompted = context.globalState.get<boolean>(PROMPTED_KEY, false);
  if (alreadyPrompted) return;

  // Show the notification
  vscode.window
    .showInformationMessage(
      "Claude Code detected. Enable AI Redact to scan prompts for secrets before they reach Claude?",
      "Enable",
      "Not Now",
      "Never"
    )
    .then((choice) => {
      if (choice === "Enable") {
        installHook(context);
      } else if (choice === "Never") {
        context.globalState.update(PROMPTED_KEY, true);
      }
      // "Not Now" — will prompt again next session
    });
}

/**
 * Command to manually install/reinstall the Claude Code hook.
 */
export function registerClaudeCodeHookCommand(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("aiRedact.enableClaudeCodeHook", () => {
      installHook(context);
    }),
    vscode.commands.registerCommand("aiRedact.disableClaudeCodeHook", () => {
      removeHook();
    })
  );
}

async function installHook(context: vscode.ExtensionContext): Promise<void> {
  try {
    const settingsPath = getClaudeSettingsPath();
    const settings = readClaudeSettings(settingsPath);

    // Find the CLI path — use the bundled one from the extension
    const cliPath = getCliPath(context);
    if (!cliPath) {
      vscode.window.showErrorMessage(
        "AI Redact: Could not find the CLI tool. Make sure the extension is properly installed."
      );
      return;
    }

    const hookCommand = `node "${cliPath}" scan --hook --stdin`;

    // Ensure required Claude Code fields exist
    if (!settings.permissions) {
      settings.permissions = [];
    }

    // Add the hook
    if (!settings.hooks) {
      settings.hooks = {};
    }
    if (!settings.hooks.UserPromptSubmit) {
      settings.hooks.UserPromptSubmit = [];
    }

    // Check if already installed
    const existing = settings.hooks.UserPromptSubmit.find(
      (h: any) => h.command && h.command.includes(HOOK_MARKER)
    );
    if (existing) {
      // Update the command in case the path changed
      existing.command = hookCommand;
    } else {
      settings.hooks.UserPromptSubmit.push({
        type: "command",
        command: hookCommand,
        timeout: 5,
        _source: HOOK_MARKER,
      });
    }

    writeClaudeSettings(settingsPath, settings);
    context.globalState.update(PROMPTED_KEY, true);

    vscode.window.showInformationMessage(
      "AI Redact is now scanning Claude Code prompts for secrets. " +
      "Any prompt containing sensitive data will be blocked before reaching Claude."
    );
  } catch (err: any) {
    vscode.window.showErrorMessage(
      `AI Redact: Failed to configure Claude Code hook: ${err.message}`
    );
  }
}

function removeHook(): void {
  try {
    const settingsPath = getClaudeSettingsPath();
    const settings = readClaudeSettings(settingsPath);

    if (settings.hooks?.UserPromptSubmit) {
      settings.hooks.UserPromptSubmit = settings.hooks.UserPromptSubmit.filter(
        (h: any) => !h.command?.includes(HOOK_MARKER) && h._source !== HOOK_MARKER
      );

      if (settings.hooks.UserPromptSubmit.length === 0) {
        delete settings.hooks.UserPromptSubmit;
      }
      if (Object.keys(settings.hooks).length === 0) {
        delete settings.hooks;
      }
    }

    writeClaudeSettings(settingsPath, settings);
    vscode.window.showInformationMessage("AI Redact Claude Code hook removed.");
  } catch (err: any) {
    vscode.window.showErrorMessage(
      `AI Redact: Failed to remove Claude Code hook: ${err.message}`
    );
  }
}

function getCliPath(context: vscode.ExtensionContext): string | null {
  // First try: the built CLI in the monorepo (development)
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders) {
    for (const folder of workspaceFolders) {
      const monorepoCli = path.join(folder.uri.fsPath, "packages", "cli", "dist", "index.js");
      if (fs.existsSync(monorepoCli)) {
        return monorepoCli;
      }
    }
  }

  // Second try: bundled CLI within the extension
  const bundledCli = path.join(context.extensionPath, "dist", "cli.js");
  if (fs.existsSync(bundledCli)) {
    return bundledCli;
  }

  // Third try: globally installed
  try {
    const { execSync } = require("child_process");
    const globalPath = execSync("which ai-redact", { encoding: "utf-8" }).trim();
    if (globalPath) return globalPath;
  } catch {
    // Not globally installed
  }

  // Fallback: use npx
  return null;
}

function getClaudeSettingsPath(): string {
  return path.join(os.homedir(), ".claude", "settings.json");
}

function readClaudeSettings(settingsPath: string): any {
  if (!fs.existsSync(settingsPath)) {
    // Create the directory if it doesn't exist
    const dir = path.dirname(settingsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return {};
  }
  const content = fs.readFileSync(settingsPath, "utf-8");
  return JSON.parse(content);
}

function writeClaudeSettings(settingsPath: string, settings: any): void {
  const dir = path.dirname(settingsPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n", "utf-8");
}
