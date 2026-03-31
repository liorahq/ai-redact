import * as vscode from "vscode";
import { scan, redact, getDetectors, ScanOptions, Detection, Severity } from "@ai-redact/core";
import { registerChatParticipant, registerChatCommands } from "./chat-participant";
import { registerModelProxy } from "./model-proxy";

const DIAGNOSTIC_SOURCE = "AI Redact";
let diagnosticCollection: vscode.DiagnosticCollection;
let statusBarItem: vscode.StatusBarItem;
let scanTimeout: ReturnType<typeof setTimeout> | undefined;

export function activate(context: vscode.ExtensionContext) {
  diagnosticCollection = vscode.languages.createDiagnosticCollection("ai-redact");
  context.subscriptions.push(diagnosticCollection);

  // AI prompt interception — chat participant (@redact) and proxy model provider
  registerChatParticipant(context);
  registerChatCommands(context);
  registerModelProxy(context);

  // Status bar
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = "aiRedact.toggleEnabled";
  context.subscriptions.push(statusBarItem);
  updateStatusBar(0);
  statusBarItem.show();

  // Commands
  context.subscriptions.push(
    vscode.commands.registerCommand("aiRedact.scanCurrentFile", () => {
      const editor = vscode.window.activeTextEditor;
      if (editor) scanDocument(editor.document);
    }),
    vscode.commands.registerCommand("aiRedact.redactAll", () => redactAllInEditor()),
    vscode.commands.registerCommand("aiRedact.toggleEnabled", () => toggleEnabled())
  );

  // Document change listener — scan on every keystroke with debounce
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (!isEnabled()) return;
      if (!getConfig().get<boolean>("scanOnType", true)) return;
      debouncedScan(e.document);
    })
  );

  // Scan when a document is opened or becomes active
  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((doc) => {
      if (isEnabled()) scanDocument(doc);
    }),
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor && isEnabled()) scanDocument(editor.document);
    })
  );

  // Clear diagnostics when a document is closed
  context.subscriptions.push(
    vscode.workspace.onDidCloseTextDocument((doc) => {
      diagnosticCollection.delete(doc.uri);
    })
  );

  // Re-scan on configuration change
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("aiRedact")) {
        if (isEnabled()) {
          scanAllOpenDocuments();
        } else {
          diagnosticCollection.clear();
          updateStatusBar(0);
        }
      }
    })
  );

  // Code action provider for quick-fix "Redact this value"
  context.subscriptions.push(
    vscode.languages.registerCodeActionsProvider("*", new RedactCodeActionProvider(), {
      providedCodeActionKinds: [vscode.CodeActionKind.QuickFix],
    })
  );

  // Scan all currently open documents on activation
  if (isEnabled()) {
    scanAllOpenDocuments();
  }
}

export function deactivate() {
  if (scanTimeout) clearTimeout(scanTimeout);
  diagnosticCollection.clear();
  statusBarItem.dispose();
}

// --- Scanning ---

function debouncedScan(document: vscode.TextDocument) {
  if (scanTimeout) clearTimeout(scanTimeout);
  scanTimeout = setTimeout(() => scanDocument(document), 300);
}

function scanDocument(document: vscode.TextDocument) {
  if (!isEnabled()) return;
  // Skip very large files (> 1MB) for performance
  if (document.getText().length > 1_000_000) return;
  // Skip non-file schemes (e.g. output, debug console)
  if (document.uri.scheme !== "file" && document.uri.scheme !== "untitled") return;

  const text = document.getText();
  const options = buildScanOptions();
  const result = scan(text, options);

  const diagnostics: vscode.Diagnostic[] = result.detections.map((d) =>
    detectionToDiagnostic(document, d)
  );

  diagnosticCollection.set(document.uri, diagnostics);
  updateStatusBar(diagnostics.length);
}

function scanAllOpenDocuments() {
  for (const doc of vscode.workspace.textDocuments) {
    scanDocument(doc);
  }
}

// --- Diagnostics ---

function detectionToDiagnostic(document: vscode.TextDocument, detection: Detection): vscode.Diagnostic {
  const startPos = document.positionAt(detection.start);
  const endPos = document.positionAt(detection.end);
  const range = new vscode.Range(startPos, endPos);

  const severity = mapSeverity(detection);
  const diagnostic = new vscode.Diagnostic(range, detection.message, severity);
  diagnostic.source = DIAGNOSTIC_SOURCE;
  diagnostic.code = detection.type;
  return diagnostic;
}

function mapSeverity(detection: Detection): vscode.DiagnosticSeverity {
  const config = getConfig();

  if (detection.category === "pii") {
    const level = config.get<string>("piiSeverity", "warning");
    return severityStringToVscode(level);
  }

  // Secrets, credentials, tokens
  const level = config.get<string>("secretSeverity", "error");
  return severityStringToVscode(level);
}

function severityStringToVscode(level: string): vscode.DiagnosticSeverity {
  switch (level) {
    case "error":
      return vscode.DiagnosticSeverity.Error;
    case "information":
      return vscode.DiagnosticSeverity.Information;
    case "warning":
    default:
      return vscode.DiagnosticSeverity.Warning;
  }
}

// --- Quick-fix Code Actions ---

class RedactCodeActionProvider implements vscode.CodeActionProvider {
  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    for (const diagnostic of context.diagnostics) {
      if (diagnostic.source !== DIAGNOSTIC_SOURCE) continue;

      const detectionType = diagnostic.code as string;
      const placeholder = `[${detectionType.toUpperCase()}_REDACTED]`;

      const fix = new vscode.CodeAction(
        `Redact this ${detectionType.replace(/-/g, " ")}`,
        vscode.CodeActionKind.QuickFix
      );
      fix.edit = new vscode.WorkspaceEdit();
      fix.edit.replace(document.uri, diagnostic.range, placeholder);
      fix.isPreferred = true;
      fix.diagnostics = [diagnostic];
      actions.push(fix);
    }

    return actions;
  }
}

// --- Redact All ---

async function redactAllInEditor() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showWarningMessage("No active editor to redact.");
    return;
  }

  const text = editor.document.getText();
  const options = buildScanOptions();
  const result = scan(text, options);

  if (result.detections.length === 0) {
    vscode.window.showInformationMessage("No sensitive data found to redact.");
    return;
  }

  const confirm = await vscode.window.showWarningMessage(
    `Found ${result.detections.length} sensitive value(s). Redact all?`,
    "Redact All",
    "Cancel"
  );
  if (confirm !== "Redact All") return;

  const redacted = redact(text, result.detections);
  const fullRange = new vscode.Range(
    editor.document.positionAt(0),
    editor.document.positionAt(text.length)
  );

  await editor.edit((builder) => {
    builder.replace(fullRange, redacted);
  });

  vscode.window.showInformationMessage(
    `Redacted ${result.detections.length} sensitive value(s).`
  );
}

// --- Status Bar ---

function updateStatusBar(findingCount: number) {
  if (!isEnabled()) {
    statusBarItem.text = "$(shield) AI Redact: Off";
    statusBarItem.tooltip = "Click to enable AI Redact scanning";
    statusBarItem.backgroundColor = undefined;
    return;
  }

  if (findingCount === 0) {
    statusBarItem.text = "$(shield) AI Redact: Clean";
    statusBarItem.tooltip = "No sensitive data detected";
    statusBarItem.backgroundColor = undefined;
  } else {
    statusBarItem.text = `$(warning) AI Redact: ${findingCount} finding${findingCount === 1 ? "" : "s"}`;
    statusBarItem.tooltip = `${findingCount} sensitive data finding(s) detected. Click to toggle.`;
    statusBarItem.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground");
  }
}

// --- Toggle ---

function toggleEnabled() {
  const config = getConfig();
  const current = config.get<boolean>("enabled", true);
  config.update("enabled", !current, vscode.ConfigurationTarget.Global);

  if (current) {
    diagnosticCollection.clear();
    updateStatusBar(0);
    vscode.window.showInformationMessage("AI Redact scanning disabled.");
  } else {
    vscode.window.showInformationMessage("AI Redact scanning enabled.");
    scanAllOpenDocuments();
  }
}

// --- Config Helpers ---

function getConfig(): vscode.WorkspaceConfiguration {
  return vscode.workspace.getConfiguration("aiRedact");
}

function isEnabled(): boolean {
  return getConfig().get<boolean>("enabled", true);
}

function buildScanOptions(): ScanOptions {
  const config = getConfig();
  const options: ScanOptions = {};

  const enabledDetectors = config.get<string[]>("enabledDetectors", []);
  if (enabledDetectors.length > 0) {
    options.enabledDetectors = enabledDetectors;
  }

  const minSeverity = config.get<string>("minSeverity", "medium");
  if (minSeverity) {
    options.minSeverity = minSeverity as Severity;
  }

  return options;
}
