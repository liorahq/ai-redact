import * as vscode from "vscode";
import { scan, redact, ScanOptions, Severity, Detection } from "@ai-redact/core";

/**
 * @redact chat participant — users invoke with `@redact <prompt>` in Copilot Chat.
 * Scans the prompt for PII/secrets, warns the user, and optionally redacts before
 * forwarding to the selected language model.
 */
export function registerChatParticipant(context: vscode.ExtensionContext): void {
  const participant = vscode.chat.createChatParticipant(
    "ai-redact.redact",
    handleChatRequest
  );
  participant.iconPath = new vscode.ThemeIcon("shield");
  context.subscriptions.push(participant);
}

interface RedactChatResult extends vscode.ChatResult {
  detectionCount?: number;
}

async function handleChatRequest(
  request: vscode.ChatRequest,
  context: vscode.ChatContext,
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken
): Promise<RedactChatResult> {
  const options = buildChatScanOptions();

  // Handle /scan command — just report findings, don't forward
  if (request.command === "scan") {
    return handleScanCommand(request, stream, options);
  }

  // Default behavior: scan, warn, then forward (redacted) to the model
  const promptText = request.prompt;
  const result = scan(promptText, options);

  if (result.detections.length === 0) {
    // Clean prompt — forward directly to the model
    stream.progress("No sensitive data detected. Forwarding to AI model...");
    await forwardToModel(request, stream, token, promptText);
    return { detectionCount: 0 };
  }

  // Sensitive data found — show warning and ask user
  const detectionSummary = summarizeDetections(result.detections);
  stream.markdown(
    `### $(warning) AI Redact: ${result.detections.length} sensitive value(s) detected\n\n` +
    detectionSummary + "\n\n"
  );

  // Offer choices via buttons
  stream.button({
    command: "aiRedact.chatForwardRedacted",
    title: "$(shield) Send Redacted Version",
    arguments: [redact(promptText, result.detections), request],
  });
  stream.button({
    command: "aiRedact.chatForwardOriginal",
    title: "$(warning) Send Original (Unsafe)",
    arguments: [promptText, request],
  });

  return { detectionCount: result.detections.length };
}

async function handleScanCommand(
  request: vscode.ChatRequest,
  stream: vscode.ChatResponseStream,
  options: ScanOptions
): Promise<RedactChatResult> {
  const result = scan(request.prompt, options);

  if (result.detections.length === 0) {
    stream.markdown("$(shield) **No sensitive data detected** in your prompt. Safe to send.\n");
    return { detectionCount: 0 };
  }

  const summary = summarizeDetections(result.detections);
  stream.markdown(
    `### $(warning) Found ${result.detections.length} sensitive value(s)\n\n` +
    summary + "\n\n" +
    "**Redacted version:**\n```\n" +
    redact(request.prompt, result.detections) +
    "\n```\n"
  );

  return { detectionCount: result.detections.length };
}

async function forwardToModel(
  request: vscode.ChatRequest,
  stream: vscode.ChatResponseStream,
  token: vscode.CancellationToken,
  text: string
): Promise<void> {
  const messages = [vscode.LanguageModelChatMessage.User(text)];

  const model = request.model;
  const response = await model.sendRequest(messages, {}, token);

  for await (const part of response.text) {
    stream.markdown(part);
  }
}

function summarizeDetections(detections: Detection[]): string {
  const grouped = new Map<string, number>();
  for (const d of detections) {
    const key = `${d.type} (${d.severity})`;
    grouped.set(key, (grouped.get(key) || 0) + 1);
  }

  const lines: string[] = [];
  for (const [key, count] of grouped) {
    const icon = key.includes("critical") ? "$(error)" : "$(warning)";
    lines.push(`- ${icon} **${key}**: ${count} occurrence${count > 1 ? "s" : ""}`);
  }
  return lines.join("\n");
}

function buildChatScanOptions(): ScanOptions {
  const config = vscode.workspace.getConfiguration("aiRedact");
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

/**
 * Register the chat button commands used by the participant.
 */
export function registerChatCommands(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "aiRedact.chatForwardRedacted",
      async (redactedText: string) => {
        // Copy redacted text to clipboard so user can paste into chat
        await vscode.env.clipboard.writeText(redactedText);
        vscode.window.showInformationMessage(
          "Redacted prompt copied to clipboard. Paste it into the chat to send."
        );
      }
    ),
    vscode.commands.registerCommand(
      "aiRedact.chatForwardOriginal",
      async (originalText: string) => {
        await vscode.env.clipboard.writeText(originalText);
        vscode.window.showWarningMessage(
          "Original prompt (with sensitive data) copied to clipboard."
        );
      }
    )
  );
}
