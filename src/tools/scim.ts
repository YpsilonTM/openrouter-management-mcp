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
  confirmSchema,
  paginationSchema,
  uuidSchema,
  workspaceIdSchema,
} from "./common.js";

const mappingIdSchema = z.string().uuid().describe("SCIM group mapping UUID.");
const roleSchema = z
  .enum(["admin", "member"])
  .describe("Workspace role granted by the mapping.");

export function registerScimTools(
  server: McpServer,
  client: OpenRouterManagementClient,
): void {
  server.registerTool(
    "openrouter_list_scim_group_mappings",
    {
      title: "List SCIM group mappings",
      description: "List SCIM directory group → workspace role mappings.",
      inputSchema: paginationSchema,
      annotations: READ_ONLY,
    },
    async (args) =>
      runTool("openrouter_list_scim_group_mappings", args, () =>
        client.request("GET", "/scim/group-mappings", { query: args }),
      ),
  );

  server.registerTool(
    "openrouter_get_scim_group_mapping",
    {
      title: "Get SCIM group mapping",
      description: "Get one SCIM group mapping by id.",
      inputSchema: { id: mappingIdSchema },
      annotations: READ_ONLY,
    },
    async ({ id }) =>
      runTool("openrouter_get_scim_group_mapping", { id }, () =>
        client.request("GET", `/scim/group-mappings/${encodeURIComponent(id)}`),
      ),
  );

  server.registerTool(
    "openrouter_create_scim_group_mapping",
    {
      title: "Create SCIM group mapping",
      description: "Map a SCIM group to a workspace role.",
      inputSchema: {
        scim_group_id: z.string().min(1),
        workspace_id: workspaceIdSchema,
        role: roleSchema,
      },
      annotations: WRITE,
    },
    async (args) =>
      runTool("openrouter_create_scim_group_mapping", args, () =>
        client.request("POST", "/scim/group-mappings", { body: args }),
      ),
  );

  server.registerTool(
    "openrouter_update_scim_group_mapping",
    {
      title: "Update SCIM group mapping",
      description: "Change the workspace role for a SCIM group mapping.",
      inputSchema: {
        id: mappingIdSchema,
        role: roleSchema,
      },
      annotations: IDEMPOTENT_WRITE,
    },
    async ({ id, role }) =>
      runTool("openrouter_update_scim_group_mapping", { id, role }, () =>
        client.request("PATCH", `/scim/group-mappings/${encodeURIComponent(id)}`, {
          body: { role },
        }),
      ),
  );

  server.registerTool(
    "openrouter_delete_scim_group_mapping",
    {
      title: "Delete SCIM group mapping",
      description:
        "Delete a SCIM group mapping. keep_members=true leaves existing workspace memberships in place.",
      inputSchema: {
        id: mappingIdSchema,
        keep_members: z.boolean(),
        confirm: confirmSchema,
      },
      annotations: DESTRUCTIVE,
    },
    async ({ id, keep_members }) =>
      runTool("openrouter_delete_scim_group_mapping", { id, keep_members }, () =>
        client.request("DELETE", `/scim/group-mappings/${encodeURIComponent(id)}`, {
          query: { keep_members },
        }),
      ),
  );

  server.registerTool(
    "openrouter_list_scim_groups",
    {
      title: "List SCIM groups",
      description: "List groups from the connected SCIM directory.",
      inputSchema: {
        ...paginationSchema,
        display_name: z.string().optional(),
        external_id: z.string().optional(),
      },
      annotations: READ_ONLY,
    },
    async (args) =>
      runTool("openrouter_list_scim_groups", args, () =>
        client.request("GET", "/scim/groups", { query: args }),
      ),
  );

  server.registerTool(
    "openrouter_start_scim_sync",
    {
      title: "Start SCIM directory sync",
      description: "Start a SCIM directory sync job.",
      annotations: WRITE,
    },
    async () =>
      runTool("openrouter_start_scim_sync", {}, () =>
        client.request("POST", "/scim/sync-jobs"),
      ),
  );

  server.registerTool(
    "openrouter_get_scim_sync_job",
    {
      title: "Get SCIM sync job status",
      description: "Get status of a SCIM directory sync job.",
      inputSchema: { id: uuidSchema.describe("Sync job UUID.") },
      annotations: READ_ONLY,
    },
    async ({ id }) =>
      runTool("openrouter_get_scim_sync_job", { id }, () =>
        client.request("GET", `/scim/sync-jobs/${encodeURIComponent(id)}`),
      ),
  );
}
