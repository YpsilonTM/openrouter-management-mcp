import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { OpenRouterManagementClient } from "../client.js";
import { DESTRUCTIVE, IDEMPOTENT_WRITE, READ_ONLY, WRITE, runTool } from "./helpers.js";

/** The list endpoint returns at most this many keys per page. */
const PAGE_SIZE = 100;
const MAX_PAGES = 50;

interface ApiKey {
  hash: string;
  name?: string;
  label?: string;
  [k: string]: unknown;
}

const hashSchema = z
  .string()
  .min(1)
  .describe("Key hash (the `hash` field from openrouter_list_keys), not the sk-or-... secret.");

const workspaceIdSchema = z
  .string()
  .uuid()
  .describe("Workspace UUID (from openrouter_list_workspaces).");

const limitResetSchema = z
  .enum(["daily", "weekly", "monthly", "none"])
  .describe(
    "When usage counted against `limit` resets (midnight UTC; weeks run Mon–Sun). `none` = never resets.",
  );

const expiresAtSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/,
    "Must be ISO 8601 UTC with seconds, e.g. 2027-12-31T23:59:59Z",
  )
  .describe("Expiration as ISO 8601 UTC with seconds, e.g. 2027-12-31T23:59:59Z.");

export function registerKeyTools(
  server: McpServer,
  client: OpenRouterManagementClient,
): void {
  server.registerTool(
    "openrouter_list_keys",
    {
      title: "List API keys",
      description:
        "List OpenRouter inference API keys with their limits and usage (daily/weekly/monthly). Returns hashes and labels only, never secrets. Keys are scoped per workspace; omit workspace_id for the default workspace. Use name_contains to find a key by name across all pages.",
      inputSchema: {
        name_contains: z
          .string()
          .min(1)
          .optional()
          .describe("Case-insensitive filter on key name/label. Fetches all pages."),
        workspace_id: workspaceIdSchema.optional(),
        include_disabled: z.boolean().optional().describe("Include disabled keys."),
        include_expired: z.boolean().optional().describe("Include expired keys."),
        offset: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe(`Pagination offset (page size ${PAGE_SIZE}). Ignored when name_contains is set.`),
      },
      annotations: READ_ONLY,
    },
    async (args) =>
      runTool("openrouter_list_keys", args, async () => {
        const query = {
          workspace_id: args.workspace_id,
          include_disabled: args.include_disabled,
          include_expired: args.include_expired,
        };

        if (!args.name_contains) {
          return client.request("GET", "/keys", {
            query: { ...query, offset: args.offset },
          });
        }

        const needle = args.name_contains.toLowerCase();
        const matches: ApiKey[] = [];
        let scanned = 0;
        for (let page = 0; page < MAX_PAGES; page++) {
          const body = await client.request<{ data: ApiKey[] }>("GET", "/keys", {
            query: { ...query, offset: page * PAGE_SIZE },
          });
          const data = body.data ?? [];
          scanned += data.length;
          for (const key of data) {
            const haystack = `${key.name ?? ""} ${key.label ?? ""}`.toLowerCase();
            if (haystack.includes(needle)) matches.push(key);
          }
          if (data.length < PAGE_SIZE) break;
        }
        return { data: matches, scanned };
      }),
  );

  server.registerTool(
    "openrouter_get_key",
    {
      title: "Get API key",
      description:
        "Get one OpenRouter API key by hash: limit, limit_remaining, limit_reset, usage, disabled, expires_at, workspace.",
      inputSchema: { hash: hashSchema },
      annotations: READ_ONLY,
    },
    async ({ hash }) =>
      runTool("openrouter_get_key", { hash }, () =>
        client.request("GET", `/keys/${encodeURIComponent(hash)}`),
      ),
  );

  server.registerTool(
    "openrouter_create_key",
    {
      title: "Create API key",
      description:
        "Create a new OpenRouter inference API key, optionally with a USD spend limit, reset interval, and expiry. The plaintext `key` is returned ONLY in this response; tell the user to store it now.",
      inputSchema: {
        name: z.string().min(1).describe("Display name for the key."),
        limit: z.number().positive().optional().describe("Spend limit in USD."),
        limit_reset: limitResetSchema.optional(),
        include_byok_in_limit: z
          .boolean()
          .optional()
          .describe("Count BYOK (bring-your-own-key) usage toward the limit."),
        expires_at: expiresAtSchema.optional(),
        workspace_id: workspaceIdSchema
          .optional()
          .describe("Workspace to create the key in. Defaults to the default workspace."),
      },
      annotations: WRITE,
    },
    async (args) =>
      runTool(
        "openrouter_create_key",
        { name: args.name, limit: args.limit, limit_reset: args.limit_reset },
        () =>
          client.request("POST", "/keys", {
            body: {
              name: args.name,
              limit: args.limit,
              limit_reset:
                args.limit_reset === undefined || args.limit_reset === "none"
                  ? undefined
                  : args.limit_reset,
              include_byok_in_limit: args.include_byok_in_limit,
              expires_at: args.expires_at,
              workspace_id: args.workspace_id,
            },
          }),
      ),
  );

  server.registerTool(
    "openrouter_update_key",
    {
      title: "Update API key",
      description:
        "Update an OpenRouter API key by hash. Use this to set or remove a spend limit (limit + limit_reset), rename, disable/enable, or move it to another workspace. Only the fields you pass are changed. Expiry (expires_at) cannot be changed after creation; to add one, create a replacement key with openrouter_create_key and disable the old key once apps are switched over.",
      inputSchema: {
        hash: hashSchema,
        name: z.string().min(1).optional().describe("New display name."),
        disabled: z.boolean().optional().describe("true disables the key, false re-enables it."),
        limit: z
          .number()
          .positive()
          .nullable()
          .optional()
          .describe("New spend limit in USD. Pass null to remove the limit."),
        limit_reset: limitResetSchema.optional(),
        include_byok_in_limit: z
          .boolean()
          .optional()
          .describe("Count BYOK usage toward the limit."),
        workspace_id: workspaceIdSchema
          .optional()
          .describe("Move the key to this workspace. Guardrails move with it; presets/BYOK/routing do not."),
      },
      annotations: IDEMPOTENT_WRITE,
    },
    async ({ hash, ...changes }) =>
      runTool("openrouter_update_key", { hash, ...changes }, async () => {
        const body: Record<string, unknown> = {};
        if (changes.name !== undefined) body.name = changes.name;
        if (changes.disabled !== undefined) body.disabled = changes.disabled;
        if (changes.limit !== undefined) body.limit = changes.limit;
        if (changes.limit_reset !== undefined) {
          body.limit_reset = changes.limit_reset === "none" ? null : changes.limit_reset;
        }
        if (changes.include_byok_in_limit !== undefined) {
          body.include_byok_in_limit = changes.include_byok_in_limit;
        }
        if (changes.workspace_id !== undefined) body.workspace_id = changes.workspace_id;

        if (Object.keys(body).length === 0) {
          throw new Error(
            "Nothing to update. Pass at least one of: name, disabled, limit, limit_reset, include_byok_in_limit, workspace_id.",
          );
        }
        return client.request("PATCH", `/keys/${encodeURIComponent(hash)}`, { body });
      }),
  );

  server.registerTool(
    "openrouter_delete_key",
    {
      title: "Delete API key",
      description:
        "Permanently delete an OpenRouter API key by hash. Irreversible: apps using it stop working. Prefer openrouter_update_key with disabled=true unless the user explicitly wants deletion.",
      inputSchema: {
        hash: hashSchema,
        confirm: z.literal(true).describe("Must be true to confirm permanent deletion."),
      },
      annotations: DESTRUCTIVE,
    },
    async ({ hash }) =>
      runTool("openrouter_delete_key", { hash }, () =>
        client.request("DELETE", `/keys/${encodeURIComponent(hash)}`),
      ),
  );
}
