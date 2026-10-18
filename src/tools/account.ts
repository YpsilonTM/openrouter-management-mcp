import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { OpenRouterManagementClient } from "../client.js";
import { READ_ONLY, runTool } from "./helpers.js";

interface CreditsResponse {
  data?: { total_credits?: number; total_usage?: number };
}

export function registerAccountTools(
  server: McpServer,
  client: OpenRouterManagementClient,
): void {
  server.registerTool(
    "openrouter_get_credits",
    {
      title: "Get credits",
      description:
        "Get OpenRouter account credits: total purchased, total used, and remaining balance (USD).",
      annotations: READ_ONLY,
    },
    async () =>
      runTool("openrouter_get_credits", {}, async () => {
        const body = await client.request<CreditsResponse>("GET", "/credits");
        const total_credits = body?.data?.total_credits;
        const total_usage = body?.data?.total_usage;
        if (typeof total_credits !== "number" || typeof total_usage !== "number") {
          return body;
        }
        return {
          total_credits,
          total_usage,
          remaining: Math.round((total_credits - total_usage) * 1e6) / 1e6,
        };
      }),
  );

  server.registerTool(
    "openrouter_get_activity",
    {
      title: "Get usage activity",
      description:
        "Get spend/usage activity for the last 30 days, grouped by date, model, and endpoint. Filter by a single date or a specific key hash to see what a key spent on.",
      inputSchema: {
        date: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
          .optional()
          .describe("Single UTC date within the last 30 days (YYYY-MM-DD)."),
        api_key_hash: z.string().min(1).optional().describe("Only activity for this key hash."),
        workspace_id: z.string().min(1).optional().describe("Only activity for this workspace."),
        group_by_workspace: z
          .boolean()
          .optional()
          .describe("Split rows per workspace and include workspace_id on each."),
      },
      annotations: READ_ONLY,
    },
    async (args) =>
      runTool("openrouter_get_activity", args, () =>
        client.request("GET", "/activity", {
          query: {
            date: args.date,
            api_key_hash: args.api_key_hash,
            workspace_id: args.workspace_id,
            group_by: args.group_by_workspace ? "workspace" : undefined,
          },
        }),
      ),
  );
}
