import { log } from "./log.js";

export const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_TIMEOUT_MS = 30_000;

export type QueryValue = string | number | boolean | undefined | null;

export interface RequestOptions {
  query?: Record<string, QueryValue>;
  body?: Record<string, unknown>;
}

export interface ClientOptions {
  apiKey?: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export class OpenRouterApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly method: string,
    readonly path: string,
  ) {
    super(message);
    this.name = "OpenRouterApiError";
  }
}

function statusHint(status: number): string | undefined {
  switch (status) {
    case 401:
      return "OPENROUTER_MANAGEMENT_API_KEY is invalid, expired, or revoked.";
    case 403:
      return "This route needs a Management API key (https://openrouter.ai/settings/management-keys), not a regular inference key.";
    case 404:
      return "Not found. Check the hash/ID (keys are listed per workspace).";
    case 429:
      return "Rate limited by OpenRouter. Retry shortly.";
    default:
      return undefined;
  }
}

function extractMessage(parsed: unknown): string {
  if (typeof parsed === "string") return parsed || "(empty response)";
  if (parsed && typeof parsed === "object") {
    const err = (parsed as { error?: unknown }).error;
    if (err && typeof err === "object" && "message" in err) {
      return String((err as { message: unknown }).message);
    }
    if (typeof err === "string") return err;
  }
  return JSON.stringify(parsed);
}

export class OpenRouterManagementClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly timeoutMs: number;

  constructor(opts: ClientOptions = {}) {
    this.apiKey = opts.apiKey?.trim() ?? "";
    this.baseUrl = (opts.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  get configured(): boolean {
    return this.apiKey.length > 0;
  }

  async request<T = unknown>(
    method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
    path: string,
    opts: RequestOptions = {},
  ): Promise<T> {
    if (!this.configured) {
      throw new Error(
        "OPENROUTER_MANAGEMENT_API_KEY is not set. Create a Management API key at https://openrouter.ai/settings/management-keys and add it to the MCP server environment.",
      );
    }

    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(opts.query ?? {})) {
      if (v !== undefined && v !== null) params.set(k, String(v));
    }
    const qs = params.toString();
    const url = `${this.baseUrl}${path}${qs ? `?${qs}` : ""}`;

    log.debug("API request", { method, path, query: qs || undefined });

    let res: Response;
    try {
      res = await this.fetchImpl(url, {
        method,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: "application/json",
          ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (e) {
      const reason =
        e instanceof Error && e.name === "TimeoutError"
          ? `timed out after ${this.timeoutMs}ms`
          : e instanceof Error
            ? e.message
            : String(e);
      throw new Error(`OpenRouter ${method} ${path} failed: ${reason}`);
    }

    const text = await res.text();
    let parsed: unknown = text;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        // non-JSON body, keep raw text
      }
    }

    if (!res.ok) {
      const hint = statusHint(res.status);
      throw new OpenRouterApiError(
        `OpenRouter ${method} ${path} failed (${res.status}): ${extractMessage(parsed)}${hint ? `\nHint: ${hint}` : ""}`,
        res.status,
        method,
        path,
      );
    }

    return parsed as T;
  }
}

export function createClientFromEnv(): OpenRouterManagementClient {
  return new OpenRouterManagementClient({
    apiKey: process.env.OPENROUTER_MANAGEMENT_API_KEY,
    baseUrl: process.env.OPENROUTER_BASE_URL,
  });
}
