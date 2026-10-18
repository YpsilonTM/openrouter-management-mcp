import { log } from "../log.js";

type TextContent = { type: "text"; text: string };

export type ToolResult = {
  content: TextContent[];
  isError?: boolean;
};

export function textResult(data: unknown): ToolResult {
  return {
    content: [
      {
        type: "text",
        text: typeof data === "string" ? data : JSON.stringify(data, null, 2),
      },
    ],
  };
}

export function errorResult(err: unknown): ToolResult {
  const message = err instanceof Error ? err.message : String(err);
  return {
    content: [{ type: "text", text: message }],
    isError: true,
  };
}

/** Wraps a tool handler with logging and error-to-result conversion. */
export async function runTool(
  tool: string,
  logFields: Record<string, unknown>,
  fn: () => Promise<unknown>,
): Promise<ToolResult> {
  const started = Date.now();
  log.info("Tool call", { tool, ...logFields });
  try {
    const data = await fn();
    log.info("Tool done", { tool, durationMs: Date.now() - started });
    return textResult(data);
  } catch (e) {
    log.error("Tool failed", {
      tool,
      durationMs: Date.now() - started,
      error: e instanceof Error ? e.message : String(e),
    });
    return errorResult(e);
  }
}

export const READ_ONLY = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

export const WRITE = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true,
} as const;

export const IDEMPOTENT_WRITE = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
} as const;

export const DESTRUCTIVE = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: true,
  openWorldHint: true,
} as const;
