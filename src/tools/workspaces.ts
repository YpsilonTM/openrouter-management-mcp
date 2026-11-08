import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { OpenRouterManagementClient } from "../client.js";
import {
  DESTRUCTIVE,
  IDEMPOTENT_WRITE,
  READ_ONLY,
  WRITE,
  runTool,
} from "./helpers.js";
import {
  budgetIntervalSchema,
  confirmSchema,
  defined,
  paginationSchema,
  workspaceRefSchema,
} from "./common.js";

const providerSortSchema = z
  .enum(["price", "throughput", "latency"])
  .nullable()
  .optional()
  .describe("Default provider sort for the workspace.");

const workspaceWriteFields = {
  name: z.string().min(1).max(200).optional().describe("Display name."),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase kebab-case slug")
    .optional()
    .describe("URL slug (lowercase kebab-case)."),
  default_text_model: z.string().nullable().optional(),
  default_image_model: z.string().nullable().optional(),
  default_provider_sort: providerSortSchema,
  disabled_server_tools: z.array(z.string()).nullable().optional(),
  io_logging_api_key_ids: z.array(z.string()).nullable().optional(),
  io_logging_sampling_rate: z.number().min(0).max(1).optional(),
  is_data_discount_logging_enabled: z.boolean().optional(),
  is_observability_broadcast_enabled: z.boolean().optional(),
  is_observability_io_logging_enabled: z.boolean().optional(),
};

export function registerWorkspaceTools(
  server: McpServer,
  client: OpenRouterManagementClient,
): void {
  server.registerTool(
    "openrouter_list_workspaces",
    {
      title: "List workspaces",
      description:
        "List OpenRouter workspaces (id, slug, name, default guardrail, routing defaults). Keys, budgets, BYOK, and guardrails are workspace-scoped.",
      inputSchema: paginationSchema,
      annotations: READ_ONLY,
    },
    async (args) =>
      runTool("openrouter_list_workspaces", args, () =>
        client.request("GET", "/workspaces", { query: args }),
      ),
  );

  server.registerTool(
    "openrouter_get_workspace",
    {
      title: "Get workspace",
      description: "Get one workspace by UUID or slug.",
      inputSchema: { workspace: workspaceRefSchema },
      annotations: READ_ONLY,
    },
    async ({ workspace }) =>
      runTool("openrouter_get_workspace", { workspace }, () =>
        client.request("GET", `/workspaces/${encodeURIComponent(workspace)}`),
      ),
  );

  server.registerTool(
    "openrouter_create_workspace",
    {
      title: "Create workspace",
      description:
        "Create a workspace. Requires name and slug. Optional defaults for models, provider sort, and observability.",
      inputSchema: {
        name: z.string().min(1).max(200).describe("Display name."),
        slug: z
          .string()
          .min(1)
          .max(100)
          .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Lowercase kebab-case slug")
          .describe("URL slug (lowercase kebab-case)."),
        default_text_model: workspaceWriteFields.default_text_model,
        default_image_model: workspaceWriteFields.default_image_model,
        default_provider_sort: workspaceWriteFields.default_provider_sort,
        disabled_server_tools: workspaceWriteFields.disabled_server_tools,
        io_logging_api_key_ids: workspaceWriteFields.io_logging_api_key_ids,
        io_logging_sampling_rate: workspaceWriteFields.io_logging_sampling_rate,
        is_data_discount_logging_enabled:
          workspaceWriteFields.is_data_discount_logging_enabled,
        is_observability_broadcast_enabled:
          workspaceWriteFields.is_observability_broadcast_enabled,
        is_observability_io_logging_enabled:
          workspaceWriteFields.is_observability_io_logging_enabled,
      },
      annotations: WRITE,
    },
    async (args) =>
      runTool("openrouter_create_workspace", { name: args.name, slug: args.slug }, () =>
        client.request("POST", "/workspaces", { body: defined(args) }),
      ),
  );

  server.registerTool(
    "openrouter_update_workspace",
    {
      title: "Update workspace",
      description:
        "Update workspace settings (name, slug, default models/sort, observability). Only passed fields change.",
      inputSchema: {
        workspace: workspaceRefSchema,
        ...workspaceWriteFields,
      },
      annotations: IDEMPOTENT_WRITE,
    },
    async ({ workspace, ...changes }) =>
      runTool("openrouter_update_workspace", { workspace, ...changes }, async () => {
        const body = defined(changes);
        if (Object.keys(body).length === 0) {
          throw new Error("Nothing to update. Pass at least one workspace field.");
        }
        return client.request("PATCH", `/workspaces/${encodeURIComponent(workspace)}`, {
          body,
        });
      }),
  );

  server.registerTool(
    "openrouter_delete_workspace",
    {
      title: "Delete workspace",
      description:
        "Permanently delete a workspace. Irreversible. For the default workspace, also pass confirm_default_workspace_deletion=true.",
      inputSchema: {
        workspace: workspaceRefSchema,
        confirm: confirmSchema,
        confirm_default_workspace_deletion: z
          .boolean()
          .optional()
          .describe("Required when deleting the account default workspace."),
      },
      annotations: DESTRUCTIVE,
    },
    async ({ workspace, confirm_default_workspace_deletion }) =>
      runTool("openrouter_delete_workspace", { workspace }, () =>
        client.request("DELETE", `/workspaces/${encodeURIComponent(workspace)}`, {
          query: { confirm_default_workspace_deletion },
        }),
      ),
  );

  server.registerTool(
    "openrouter_list_workspace_members",
    {
      title: "List workspace members",
      description: "List members of a workspace (user_id, role).",
      inputSchema: {
        workspace: workspaceRefSchema,
        ...paginationSchema,
      },
      annotations: READ_ONLY,
    },
    async ({ workspace, ...query }) =>
      runTool("openrouter_list_workspace_members", { workspace, ...query }, () =>
        client.request("GET", `/workspaces/${encodeURIComponent(workspace)}/members`, {
          query,
        }),
      ),
  );

  server.registerTool(
    "openrouter_add_workspace_members",
    {
      title: "Add workspace members",
      description:
        "Bulk-add organization members to a workspace. They inherit their org role (Org Admin→Workspace Admin, Org Member→Workspace Member).",
      inputSchema: {
        workspace: workspaceRefSchema,
        user_ids: z
          .array(z.string().min(1))
          .min(1)
          .max(100)
          .describe("Organization member user IDs (from openrouter_list_organization_members)."),
      },
      annotations: WRITE,
    },
    async ({ workspace, user_ids }) =>
      runTool("openrouter_add_workspace_members", { workspace, count: user_ids.length }, () =>
        client.request("POST", `/workspaces/${encodeURIComponent(workspace)}/members/add`, {
          body: { user_ids },
        }),
      ),
  );

  server.registerTool(
    "openrouter_remove_workspace_members",
    {
      title: "Remove workspace members",
      description: "Bulk-remove members from a workspace.",
      inputSchema: {
        workspace: workspaceRefSchema,
        user_ids: z.array(z.string().min(1)).min(1).max(100),
        confirm: confirmSchema,
      },
      annotations: DESTRUCTIVE,
    },
    async ({ workspace, user_ids }) =>
      runTool(
        "openrouter_remove_workspace_members",
        { workspace, count: user_ids.length },
        () =>
          client.request(
            "POST",
            `/workspaces/${encodeURIComponent(workspace)}/members/remove`,
            { body: { user_ids } },
          ),
      ),
  );

  server.registerTool(
    "openrouter_list_workspace_budgets",
    {
      title: "List workspace budgets",
      description:
        "List spend budgets (daily/weekly/monthly/lifetime) for a workspace. Caps total spend across all keys, unlike per-key limits.",
      inputSchema: { workspace: workspaceRefSchema },
      annotations: READ_ONLY,
    },
    async ({ workspace }) =>
      runTool("openrouter_list_workspace_budgets", { workspace }, () =>
        client.request("GET", `/workspaces/${encodeURIComponent(workspace)}/budgets`),
      ),
  );

  server.registerTool(
    "openrouter_get_workspace_budget",
    {
      title: "Get workspace budget",
      description: "Get the budget for one interval on a workspace.",
      inputSchema: {
        workspace: workspaceRefSchema,
        interval: budgetIntervalSchema,
      },
      annotations: READ_ONLY,
    },
    async ({ workspace, interval }) =>
      runTool("openrouter_get_workspace_budget", { workspace, interval }, () =>
        client.request(
          "GET",
          `/workspaces/${encodeURIComponent(workspace)}/budgets/${interval}`,
        ),
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
        interval: budgetIntervalSchema,
        limit_usd: z.number().positive().describe("Budget in USD (> 0)."),
        include_byok_in_budgets: z
          .boolean()
          .optional()
          .describe(
            "Count BYOK spend toward budgets. Workspace-wide: applies to every interval. Omit to leave unchanged.",
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
      description:
        "Remove a workspace spend budget for one interval, leaving that interval uncapped.",
      inputSchema: {
        workspace: workspaceRefSchema,
        interval: budgetIntervalSchema,
        confirm: confirmSchema,
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
