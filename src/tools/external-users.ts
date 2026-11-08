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
import { confirmSchema, paginationSchema } from "./common.js";

const externalUserSchema = z
  .string()
  .min(1)
  .max(512)
  .describe("External user identifier.");

export function registerExternalUserTools(
  server: McpServer,
  client: OpenRouterManagementClient,
): void {
  server.registerTool(
    "openrouter_list_external_users",
    {
      title: "List external users",
      description: "List registered external users (Connect / provisioned customers).",
      inputSchema: {
        ...paginationSchema,
        user: z.string().min(1).optional().describe("Filter by exact user id."),
        include_inactive: z.boolean().optional(),
      },
      annotations: READ_ONLY,
    },
    async (args) =>
      runTool("openrouter_list_external_users", args, () =>
        client.request("GET", "/external-users", { query: args }),
      ),
  );

  server.registerTool(
    "openrouter_get_external_user",
    {
      title: "Get external user",
      description: "Get one registered external user.",
      inputSchema: { user: externalUserSchema },
      annotations: READ_ONLY,
    },
    async ({ user }) =>
      runTool("openrouter_get_external_user", { user }, () =>
        client.request("GET", `/external-users/${encodeURIComponent(user)}`),
      ),
  );

  server.registerTool(
    "openrouter_create_external_user",
    {
      title: "Register external user",
      description: "Register an external user id.",
      inputSchema: { user: externalUserSchema },
      annotations: WRITE,
    },
    async ({ user }) =>
      runTool("openrouter_create_external_user", { user }, () =>
        client.request("POST", "/external-users", { body: { user } }),
      ),
  );

  server.registerTool(
    "openrouter_update_external_user",
    {
      title: "Update external user",
      description: "Set is_active on a registered external user.",
      inputSchema: {
        user: externalUserSchema,
        is_active: z.boolean(),
      },
      annotations: IDEMPOTENT_WRITE,
    },
    async ({ user, is_active }) =>
      runTool("openrouter_update_external_user", { user, is_active }, () =>
        client.request("PATCH", `/external-users/${encodeURIComponent(user)}`, {
          body: { is_active },
        }),
      ),
  );

  server.registerTool(
    "openrouter_delete_external_user",
    {
      title: "Deactivate external user",
      description: "Deactivate (delete) a registered external user.",
      inputSchema: { user: externalUserSchema, confirm: confirmSchema },
      annotations: DESTRUCTIVE,
    },
    async ({ user }) =>
      runTool("openrouter_delete_external_user", { user }, () =>
        client.request("DELETE", `/external-users/${encodeURIComponent(user)}`),
      ),
  );
}
