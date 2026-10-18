export type LogLevel = "error" | "warn" | "info" | "debug";

let level: LogLevel = "info";

const order: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

export function setLogLevel(next: LogLevel): void {
  level = next;
}

export function getLogLevel(): LogLevel {
  return level;
}

function write(lvl: LogLevel, message: string, fields?: Record<string, unknown>): void {
  if (order[lvl] > order[level]) return;
  const payload = fields
    ? `${message} ${JSON.stringify(fields)}`
    : message;
  process.stderr.write(`[openrouter-mgmt ${lvl}] ${payload}\n`);
}

export const log = {
  error: (message: string, fields?: Record<string, unknown>) =>
    write("error", message, fields),
  warn: (message: string, fields?: Record<string, unknown>) =>
    write("warn", message, fields),
  info: (message: string, fields?: Record<string, unknown>) =>
    write("info", message, fields),
  debug: (message: string, fields?: Record<string, unknown>) =>
    write("debug", message, fields),
};
