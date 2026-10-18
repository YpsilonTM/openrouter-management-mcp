import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { OpenRouterManagementClient } from "../client.js";
import { DESTRUCTIVE, IDEMPOTENT_WRITE, READ_ONLY, runTool } from "./helpers.js";

const workspaceRefSchema = z
  .string()
  .min(1)
  .describe("Workspace UUID or slug (from openrouter_list_workspaces).");

const intervalSchema = z
  .enum(["daily", "weekly", "monthly", "lifetime"])
  .describe("Budget interval. `lifetime` is a one-time budget that never resets.");

export function registerWorkspaceTools(
  server: McpServer,
  client: OpenRouterManagementClient,
): void {
  server.registerTool(
    "openrouter_list_workspaces",
    {
      title: "List workspaces",
      description:
        "List OpenRouter workspaces (id, slug, name). API keys and budgets are scoped to a workspace.",
      inputSchema: {
        offset: z.number().int().min(0).optional().describe("Records to skip."),
        limit: z.number().int().min(1).max(100).optional().describe("Max records (1-100)."),
      },
      annotations: READ_ONLY,
    },
    async (args) =>
      runTool("openrouter_list_workspaces", args, () =>
        client.request("GET", "/workspaces", { query: args }),
      ),
  );

  server.registerTool(
    "openrouter_list_workspace_budgets",
    {
      title: "List workspace budgets",
      description:
        "List spend budgets (daily/weekly/monthly/lifetime) for a workspace. Budgets cap total spend across all keys in the workspace, unlike per-key limits.",
      inputSchema: { workspace: workspaceRefSchema },
      annotations: READ_ONLY,
    },
    async ({ workspace }) =>
      runTool("openrouter_list_workspace_budgets", { workspace }, () =>
        client.request("GET", `/workspaces/${encodeURIComponent(workspace)}/budgets`),
      ),
  );

  server.registerTool(
    "openrouter_set_workspace_budget",
    {
      title: "Set workspace budget",
      description:
        "Create or update a workspace spend budget for one interval. Caps total spend of all keys in the workspace.",
      inputSchema: {
        workspace: workspaceRefSchema,
        interval: intervalSchema,
        limit_usd: z.number().positive().describe("Budget in USD (> 0)."),
        include_byok_in_budgets: z
          .boolean()
          .optional()
          .describe(
            "Count BYOK spend toward budgets. Workspace-wide: applies to every interval, not only this one. Omit to leave unchanged.",
          ),
      },
      annotations: IDEMPOTENT_WRITE,
    },
    async ({ workspace, interval, ...body }) =>
      runTool("openrouter_set_workspace_budget", { workspace, interval, ...body }, () =>
        client.request(
          "PUT",
          `/workspaces/${encodeURIComponent(workspace)}/budgets/${interval}`,
          { body },
        ),
      ),
  );

  server.registerTool(
    "openrouter_delete_workspace_budget",
    {
      title: "Delete workspace budget",
      description: "Remove a workspace spend budget for one interval, leaving that interval uncapped.",
      inputSchema: {
        workspace: workspaceRefSchema,
        interval: intervalSchema,
        confirm: z.literal(true).describe("Must be true to confirm removing the budget."),
      },
      annotations: DESTRUCTIVE,
    },
    async ({ workspace, interval }) =>
      runTool("openrouter_delete_workspace_budget", { workspace, interval }, () =>
        client.request(
          "DELETE",
          `/workspaces/${encodeURIComponent(workspace)}/budgets/${interval}`,
        ),
      ),
  );
}
