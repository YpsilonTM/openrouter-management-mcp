#!/usr/bin/env node
import { log, getLogLevel, setLogLevel, type LogLevel } from "./log.js";
import { startMcpServer } from "./server.js";

const LOG_LEVELS: readonly LogLevel[] = ["error", "warn", "info", "debug"];

function printHelp(): void {
  process.stderr.write(
    `
openrouter-management-mcp — OpenRouter Management API over MCP (stdio)

Usage:
  openrouter-management-mcp     Start MCP server on stdio

Environment:
  OPENROUTER_MANAGEMENT_API_KEY   Management API key (https://openrouter.ai/settings/management-keys)
  OPENROUTER_MGMT_LOG_LEVEL       error|warn|info|debug (default info, logs go to stderr)
  OPENROUTER_BASE_URL             Override API base (default https://openrouter.ai/api/v1)
`.trim() + "\n",
  );
}

async function main(): Promise<void> {
  const level = (process.env.OPENROUTER_MGMT_LOG_LEVEL ?? "info").toLowerCase();
  if ((LOG_LEVELS as readonly string[]).includes(level)) {
    setLogLevel(level as LogLevel);
  }

  if (process.argv.includes("-h") || process.argv.includes("--help")) {
    printHelp();
    return;
  }

  await startMcpServer();
}

main().catch((err) => {
  const fields: Record<string, unknown> = {
    error: err instanceof Error ? err.message : String(err),
  };
  if (getLogLevel() === "debug" && err instanceof Error) {
    fields.stack = err.stack;
  }
  log.error("Fatal error", fields);
  process.exit(1);
});
