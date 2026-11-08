import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { OpenRouterManagementClient } from "../client.js";
import { READ_ONLY, runTool } from "./helpers.js";
import { defined, jsonObject } from "./common.js";

export function registerAnalyticsTools(
  server: McpServer,
  client: OpenRouterManagementClient,
): void {
  server.registerTool(
    "openrouter_get_analytics_meta",
    {
      title: "Get analytics meta",
      description:
        "List available analytics metrics, dimensions, filter operators, and granularities for openrouter_query_analytics.",
      annotations: READ_ONLY,
    },
    async () =>
      runTool("openrouter_get_analytics_meta", {}, () =>
        client.request("GET", "/analytics/meta"),
      ),
  );

  server.registerTool(
    "openrouter_query_analytics",
    {
      title: "Query analytics",
      description:
        "Run an analytics query. Call openrouter_get_analytics_meta first for valid metrics/dimensions. metrics is required.",
      inputSchema: {
        metrics: z
          .array(z.string().min(1))
          .min(1)
          .describe("Metric names from analytics meta."),
        dimensions: z.array(z.string().min(1)).optional(),
        filters: z.array(z.record(z.unknown())).optional(),
        granularity: z.string().optional(),
        group_limit: z.number().int().positive().optional(),
        limit: z.number().int().positive().optional(),
        order_by: z.array(z.record(z.unknown())).optional(),
        time_range: jsonObject.optional(),
        classifier_dimensions: jsonObject.optional(),
        classifier_filters: jsonObject.optional(),
      },
      annotations: READ_ONLY,
    },
    async (args) =>
      runTool("openrouter_query_analytics", { metrics: args.metrics }, () =>
        client.request("POST", "/analytics/query", { body: defined(args) }),
      ),
  );
}
