#!/usr/bin/env node

import { scan, redact, getDetectors, ScanOptions, Severity, Detection } from "@ai-redact/core";
import * as fs from "fs";
import * as path from "path";

// Exit codes
const EXIT_CLEAN = 0;
const EXIT_FINDINGS = 1;
const EXIT_BLOCK = 2; // Claude Code hooks: exit 2 = block the request
const EXIT_ERROR = 3;

interface CliOptions {
  command: string;
  files: string[];
  stdin: boolean;
  json: boolean;
  quiet: boolean;
  minSeverity: Severity;
  enabledDetectors: string[];
  redactOutput: boolean;
  hookMode: boolean; // Claude Code hook mode: exit 2 on findings
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    printUsage();
    process.exit(EXIT_CLEAN);
  }

  if (args.includes("--version") || args.includes("-v")) {
    console.log("ai-redact 0.1.0");
    process.exit(EXIT_CLEAN);
  }

  if (args.includes("--list-detectors")) {
    listDetectors();
    process.exit(EXIT_CLEAN);
  }

  const options = parseArgs(args);

  if (options.stdin) {
    readStdin().then((text) => {
      const exitCode = processText(text, "<stdin>", options);
      process.exit(exitCode);
    }).catch((err) => {
      console.error("Error reading stdin:", err.message);
      process.exit(EXIT_ERROR);
    });
  } else if (options.files.length > 0) {
    let worstExit = EXIT_CLEAN;
    for (const file of options.files) {
      try {
        const text = fs.readFileSync(file, "utf-8");
        const exitCode = processText(text, file, options);
        if (exitCode > worstExit) worstExit = exitCode;
      } catch (err: any) {
        console.error(`Error reading ${file}: ${err.message}`);
        worstExit = EXIT_ERROR;
      }
    }
    process.exit(worstExit);
  } else {
    // Check if stdin has data piped to it
    if (!process.stdin.isTTY) {
      readStdin().then((text) => {
        const exitCode = processText(text, "<stdin>", options);
        process.exit(exitCode);
      }).catch((err) => {
        console.error("Error reading stdin:", err.message);
        process.exit(EXIT_ERROR);
      });
    } else {
      console.error("No input provided. Use --stdin, pipe data, or pass file paths.");
      console.error("Run ai-redact --help for usage.");
      process.exit(EXIT_ERROR);
    }
  }
}

function processText(text: string, source: string, options: CliOptions): number {
  const scanOptions: ScanOptions = {
    minSeverity: options.minSeverity,
  };
  if (options.enabledDetectors.length > 0) {
    scanOptions.enabledDetectors = options.enabledDetectors;
  }

  const result = scan(text, scanOptions);

  if (result.detections.length === 0) {
    if (!options.quiet) {
      if (options.json) {
        console.log(JSON.stringify({ source, detections: [], clean: true }));
      } else {
        console.log(`${source}: clean`);
      }
    }
    return EXIT_CLEAN;
  }

  // Output findings
  if (options.json) {
    console.log(JSON.stringify({
      source,
      clean: false,
      detections: result.detections.map((d) => ({
        type: d.type,
        category: d.category,
        severity: d.severity,
        start: d.start,
        end: d.end,
        message: d.message,
        line: getLineNumber(text, d.start),
      })),
    }));
  } else if (options.redactOutput) {
    // Output the redacted text to stdout
    console.log(redact(text, result.detections));
  } else if (!options.quiet) {
    printFindings(text, source, result.detections);
  }

  return options.hookMode ? EXIT_BLOCK : EXIT_FINDINGS;
}

function printFindings(text: string, source: string, detections: Detection[]) {
  const lines = text.split("\n");
  console.log(`\n${source}: ${detections.length} finding(s)\n`);

  for (const d of detections) {
    const lineNum = getLineNumber(text, d.start);
    const line = lines[lineNum - 1] || "";
    const severityLabel = severityColor(d.severity);

    console.log(`  ${severityLabel} ${d.message}`);
    console.log(`    ${source}:${lineNum}  ${d.type}`);

    // Show the line with the finding highlighted
    const colStart = d.start - getLineOffset(text, lineNum);
    const colEnd = Math.min(d.end - getLineOffset(text, lineNum), line.length);
    if (colStart >= 0 && colEnd <= line.length) {
      console.log(`    ${line}`);
      console.log(`    ${" ".repeat(colStart)}${"^".repeat(Math.max(1, colEnd - colStart))}`);
    }
    console.log();
  }
}

function getLineNumber(text: string, offset: number): number {
  let line = 1;
  for (let i = 0; i < offset && i < text.length; i++) {
    if (text[i] === "\n") line++;
  }
  return line;
}

function getLineOffset(text: string, lineNum: number): number {
  let line = 1;
  for (let i = 0; i < text.length; i++) {
    if (line === lineNum) return i;
    if (text[i] === "\n") line++;
  }
  return 0;
}

function severityColor(severity: Severity): string {
  switch (severity) {
    case "critical": return "[CRITICAL]";
    case "high":     return "[HIGH]    ";
    case "medium":   return "[MEDIUM]  ";
    case "low":      return "[LOW]     ";
  }
}

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    process.stdin.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    process.stdin.on("error", reject);
  });
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    command: "scan",
    files: [],
    stdin: false,
    json: false,
    quiet: false,
    minSeverity: "low",
    enabledDetectors: [],
    redactOutput: false,
    hookMode: false,
  };

  let i = 0;
  // Skip "scan" command word if present
  if (args[0] === "scan") i = 1;

  for (; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--stdin":
        options.stdin = true;
        break;
      case "--json":
        options.json = true;
        break;
      case "--quiet":
      case "-q":
        options.quiet = true;
        break;
      case "--redact":
        options.redactOutput = true;
        break;
      case "--hook":
        options.hookMode = true;
        break;
      case "--min-severity":
        i++;
        if (i < args.length) {
          options.minSeverity = args[i] as Severity;
        }
        break;
      case "--detectors":
        i++;
        if (i < args.length) {
          options.enabledDetectors = args[i].split(",");
        }
        break;
      default:
        if (!arg.startsWith("-")) {
          options.files.push(arg);
        }
        break;
    }
  }

  return options;
}

function listDetectors() {
  const detectors = getDetectors();
  console.log("Available detectors:\n");
  for (const d of detectors) {
    console.log(`  ${d.name.padEnd(25)} ${d.description}`);
  }
}

function printUsage() {
  console.log(`
ai-redact — Scan for PII, secrets, and credentials

USAGE
  ai-redact scan [options] [files...]
  ai-redact scan --stdin
  echo "text" | ai-redact scan
  ai-redact --list-detectors

OPTIONS
  --stdin             Read from stdin
  --json              Output results as JSON
  --quiet, -q         Suppress output (exit code only)
  --redact            Output redacted text to stdout
  --hook              Claude Code hook mode (exit code 2 on findings)
  --min-severity LVL  Minimum severity: low, medium, high, critical
  --detectors LIST    Comma-separated list of detector names
  --list-detectors    Show all available detectors
  --help, -h          Show this help
  --version, -v       Show version

EXIT CODES
  0  Clean — no sensitive data found
  1  Findings — sensitive data detected
  2  Block — sensitive data detected (hook mode)
  3  Error — could not read input

CLAUDE CODE INTEGRATION
  Add to .claude/settings.json:

  {
    "hooks": {
      "UserPromptSubmit": [{
        "type": "command",
        "command": "ai-redact scan --hook --stdin",
        "timeout": 5
      }]
    }
  }

EXAMPLES
  ai-redact scan config.yml
  ai-redact scan --json src/*.ts
  cat prompt.txt | ai-redact scan --hook
  ai-redact scan --redact < secrets.env > clean.env
`);
}

main();
