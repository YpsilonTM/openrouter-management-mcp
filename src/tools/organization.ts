import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { OpenRouterManagementClient } from "../client.js";
import { IDEMPOTENT_WRITE, READ_ONLY, runTool } from "./helpers.js";
import { paginationSchema } from "./common.js";

export function registerOrganizationTools(
  server: McpServer,
  client: OpenRouterManagementClient,
): void {
  server.registerTool(
    "openrouter_list_organization_members",
    {
      title: "List organization members",
      description:
        "List organization members (id/user_id and role). Org-only; personal accounts get 404.",
      inputSchema: paginationSchema,
      annotations: READ_ONLY,
    },
    async (args) =>
      runTool("openrouter_list_organization_members", args, () =>
        client.request("GET", "/organization/members", { query: args }),
      ),
  );

  server.registerTool(
    "openrouter_get_organization_settings",
    {
      title: "Get organization settings",
      description:
        "Read org settings (e.g. filtered model catalog). Org management keys only; personal accounts get 404.",
      annotations: READ_ONLY,
    },
    async () =>
      runTool("openrouter_get_organization_settings", {}, () =>
        client.request("GET", "/organization/settings"),
      ),
  );

  server.registerTool(
    "openrouter_update_organization_settings",
    {
      title: "Update organization settings",
      description:
        "Update org settings. Currently: is_filtered_model_catalog_enabled (Settings → Privacy → filter model catalog for API keys).",
      inputSchema: {
        is_filtered_model_catalog_enabled: z
          .boolean()
          .describe(
            "When true, org API keys only see models allowed by workspace guardrails/preferences.",
          ),
      },
      annotations: IDEMPOTENT_WRITE,
    },
    async (args) =>
      runTool("openrouter_update_organization_settings", args, () =>
        client.request("PATCH", "/organization/settings", { body: args }),
      ),
  );
}
