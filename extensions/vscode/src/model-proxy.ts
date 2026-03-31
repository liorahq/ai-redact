import * as vscode from "vscode";
import { scan, redact, ScanOptions, Severity, Detection } from "@ai-redact/core";

const PROXY_VENDOR = "ai-redact";
const OUTPUT_CHANNEL_NAME = "AI Redact Interceptor";

let outputChannel: vscode.OutputChannel;

/**
 * Proxy Language Model Provider.
 *
 * Registers as a selectable model in the VS Code chat model dropdown.
 * When the user picks an AI Redact proxy model, all messages flow through
 * our scanner before being forwarded to the real underlying model.
 *
 * The user sees models like:
 *   "AI Redact: GPT-4o (Protected)"
 *   "AI Redact: Claude 3.5 Sonnet (Protected)"
 */
export function registerModelProxy(context: vscode.ExtensionContext): void {
  outputChannel = vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);
  context.subscriptions.push(outputChannel);

  const provider = new RedactModelProvider();

  context.subscriptions.push(
    vscode.lm.registerLanguageModelChatProvider(PROXY_VENDOR, provider)
  );

  // Re-register proxy models when available models change
  context.subscriptions.push(
    vscode.lm.onDidChangeChatModels(() => {
      provider.refreshModels();
    })
  );

  log("Model proxy provider registered");
}

interface ProxyModelInfo extends vscode.LanguageModelChatInformation {
  /** The real model ID to forward requests to */
  readonly targetModelId: string;
}

class RedactModelProvider
  implements vscode.LanguageModelChatProvider<ProxyModelInfo>
{
  private cachedModels: ProxyModelInfo[] = [];

  async refreshModels(): Promise<void> {
    this.cachedModels = await this.discoverModels();
  }

  async provideLanguageModelChatInformation(
    _options: { silent: boolean },
    _token: vscode.CancellationToken
  ): Promise<ProxyModelInfo[]> {
    if (this.cachedModels.length === 0) {
      this.cachedModels = await this.discoverModels();
    }
    return this.cachedModels;
  }

  async provideLanguageModelChatResponse(
    model: ProxyModelInfo,
    messages: readonly vscode.LanguageModelChatRequestMessage[],
    _options: vscode.ProvideLanguageModelChatResponseOptions,
    progress: vscode.Progress<vscode.LanguageModelResponsePart>,
    token: vscode.CancellationToken
  ): Promise<void> {
    log(`Intercepting request to ${model.name} (target: ${model.targetModelId})`);

    const scanOptions = buildProxyScanOptions();
    let totalDetections = 0;
    const scannedMessages: vscode.LanguageModelChatMessage[] = [];

    // Scan each message for sensitive data
    for (const msg of messages) {
      const textContent = extractTextContent(msg);
      if (!textContent) {
        scannedMessages.push(requestMsgToChatMsg(msg));
        continue;
      }

      const result = scan(textContent, scanOptions);
      totalDetections += result.detections.length;

      if (result.detections.length > 0) {
        const action = getInterceptionAction();

        if (action === "block") {
          log(`BLOCKED: ${result.detections.length} finding(s) in message`);
          progress.report(
            new vscode.LanguageModelTextPart(
              `⚠️ **AI Redact blocked this request.**\n\n` +
              `Found ${result.detections.length} sensitive value(s) in your prompt:\n` +
              formatDetections(result.detections) + "\n\n" +
              `Remove the sensitive data and try again, or change the interception mode to "warn" or "redact" in settings.`
            )
          );
          return;
        }

        if (action === "redact") {
          const redactedText = redact(textContent, result.detections);
          log(`REDACTED: ${result.detections.length} finding(s) in message`);
          scannedMessages.push(rebuildMessage(msg, redactedText));
          continue;
        }

        // action === "warn" — forward original but notify
        log(`WARNED: ${result.detections.length} finding(s) in message (forwarding anyway)`);
      }

      scannedMessages.push(requestMsgToChatMsg(msg));
    }

    if (totalDetections > 0) {
      const action = getInterceptionAction();
      if (action === "warn" || action === "redact") {
        progress.report(
          new vscode.LanguageModelTextPart(
            `> ⚠️ AI Redact: ${totalDetections} sensitive value(s) detected` +
            (action === "redact" ? " and redacted" : "") + ".\n\n"
          )
        );
      }
    }

    // Forward to the real model
    const targetModels = await vscode.lm.selectChatModels({
      id: model.targetModelId,
    });

    if (targetModels.length === 0) {
      progress.report(
        new vscode.LanguageModelTextPart(
          `Could not find the target model "${model.targetModelId}". ` +
          `Make sure Copilot or another AI extension is installed and authenticated.`
        )
      );
      return;
    }

    const targetModel = targetModels[0];
    log(`Forwarding to ${targetModel.name} (${targetModel.id})`);

    const response = await targetModel.sendRequest(scannedMessages, {}, token);

    for await (const part of response.text) {
      progress.report(new vscode.LanguageModelTextPart(part));
    }
  }

  async provideTokenCount(
    model: ProxyModelInfo,
    text: string | vscode.LanguageModelChatRequestMessage,
    token: vscode.CancellationToken
  ): Promise<number> {
    // Delegate token counting to the target model
    const targetModels = await vscode.lm.selectChatModels({
      id: model.targetModelId,
    });
    if (targetModels.length > 0) {
      const input = typeof text === "string" ? text : extractTextContent(text) || "";
      return targetModels[0].countTokens(input, token);
    }
    // Rough fallback: ~4 chars per token
    const content = typeof text === "string" ? text : extractTextContent(text) || "";
    return Math.ceil(content.length / 4);
  }

  private async discoverModels(): Promise<ProxyModelInfo[]> {
    const allModels = await vscode.lm.selectChatModels();
    const proxyModels: ProxyModelInfo[] = [];

    for (const model of allModels) {
      // Don't proxy our own models
      if (model.vendor === PROXY_VENDOR) continue;

      proxyModels.push({
        id: `ai-redact-${model.id}`,
        name: `AI Redact: ${model.name} (Protected)`,
        family: model.family,
        version: model.version,
        maxInputTokens: model.maxInputTokens,
        maxOutputTokens: model.maxInputTokens,
        capabilities: { imageInput: false },
        targetModelId: model.id,
      });
    }

    log(`Discovered ${proxyModels.length} models to proxy`);
    return proxyModels;
  }
}

// --- Helpers ---

function extractTextContent(msg: vscode.LanguageModelChatRequestMessage | vscode.LanguageModelChatMessage): string | null {
  const parts: string[] = [];
  for (const part of msg.content) {
    if (part instanceof vscode.LanguageModelTextPart) {
      parts.push(part.value);
    }
  }
  return parts.length > 0 ? parts.join("\n") : null;
}

/** Convert a read-only request message into a mutable ChatMessage for forwarding. */
function requestMsgToChatMsg(msg: vscode.LanguageModelChatRequestMessage): vscode.LanguageModelChatMessage {
  const text = extractTextContent(msg) || "";
  if (msg.role === vscode.LanguageModelChatMessageRole.User) {
    return vscode.LanguageModelChatMessage.User(text, msg.name);
  }
  return vscode.LanguageModelChatMessage.Assistant(text, msg.name);
}

function rebuildMessage(
  original: vscode.LanguageModelChatRequestMessage,
  newText: string
): vscode.LanguageModelChatMessage {
  if (original.role === vscode.LanguageModelChatMessageRole.User) {
    return vscode.LanguageModelChatMessage.User(newText, original.name);
  }
  return vscode.LanguageModelChatMessage.Assistant(newText, original.name);
}

function formatDetections(detections: Detection[]): string {
  const grouped = new Map<string, number>();
  for (const d of detections) {
    grouped.set(d.type, (grouped.get(d.type) || 0) + 1);
  }
  return Array.from(grouped.entries())
    .map(([type, count]) => `- **${type}**: ${count}`)
    .join("\n");
}

function getInterceptionAction(): "block" | "warn" | "redact" {
  const config = vscode.workspace.getConfiguration("aiRedact");
  return config.get<"block" | "warn" | "redact">("interceptionMode", "warn");
}

function buildProxyScanOptions(): ScanOptions {
  const config = vscode.workspace.getConfiguration("aiRedact");
  const options: ScanOptions = {};

  const enabledDetectors = config.get<string[]>("enabledDetectors", []);
  if (enabledDetectors.length > 0) {
    options.enabledDetectors = enabledDetectors;
  }

  // For interception, always scan at minimum "low" to catch everything
  options.minSeverity = "low";
  return options;
}

function log(message: string): void {
  const timestamp = new Date().toISOString();
  outputChannel.appendLine(`[${timestamp}] ${message}`);
}
