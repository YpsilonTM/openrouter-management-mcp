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
  defined,
  paginationSchema,
  stringListNullable,
  workspaceIdSchema,
} from "./common.js";

const byokIdSchema = z.string().uuid().describe("BYOK credential UUID.");

const byokFields = {
  name: z.string().min(1).optional().describe("Display name."),
  key: z
    .string()
    .min(1)
    .optional()
    .describe("Provider API key secret (only sent to OpenRouter; never logged by this MCP)."),
  allowed_api_key_hashes: z.array(z.string().min(1)).nullable().optional(),
  allowed_models: stringListNullable,
  allowed_user_ids: z.array(z.string().min(1)).nullable().optional(),
  declared_region: z.string().nullable().optional(),
  declared_zdr: z.boolean().nullable().optional(),
  disabled: z.boolean().optional(),
  is_byok_only: z.boolean().optional(),
  is_fallback: z.boolean().optional(),
  is_required: z.boolean().optional(),
};

export function registerByokTools(
  server: McpServer,
  client: OpenRouterManagementClient,
): void {
  server.registerTool(
    "openrouter_list_byok",
    {
      title: "List BYOK credentials",
      description:
        "List bring-your-own-key provider credentials for a workspace (secrets are never returned).",
      inputSchema: {
        ...paginationSchema,
        workspace_id: workspaceIdSchema.optional(),
        provider: z
          .string()
          .min(1)
          .optional()
          .describe("Provider slug filter, e.g. openai, anthropic, amazon-bedrock."),
      },
      annotations: READ_ONLY,
    },
    async (args) =>
      runTool("openrouter_list_byok", args, () =>
        client.request("GET", "/byok", { query: args }),
      ),
  );

  server.registerTool(
    "openrouter_get_byok",
    {
      title: "Get BYOK credential",
      description: "Get one BYOK credential by id (no plaintext provider key).",
      inputSchema: { id: byokIdSchema },
      annotations: READ_ONLY,
    },
    async ({ id }) =>
      runTool("openrouter_get_byok", { id }, () =>
        client.request("GET", `/byok/${encodeURIComponent(id)}`),
      ),
  );

  server.registerTool(
    "openrouter_create_byok",
    {
      title: "Create BYOK credential",
      description:
        "Create a BYOK provider credential. The provider key is accepted once and never returned again.",
      inputSchema: {
        provider: z.string().min(1).describe("Provider slug, e.g. openai."),
        key: z.string().min(1).describe("Provider API key secret."),
        workspace_id: workspaceIdSchema.optional(),
        name: byokFields.name,
        allowed_api_key_hashes: byokFields.allowed_api_key_hashes,
        allowed_models: byokFields.allowed_models,
        allowed_user_ids: byokFields.allowed_user_ids,
        declared_region: byokFields.declared_region,
        declared_zdr: byokFields.declared_zdr,
        disabled: byokFields.disabled,
        is_byok_only: byokFields.is_byok_only,
        is_fallback: byokFields.is_fallback,
        is_required: byokFields.is_required,
      },
      annotations: WRITE,
    },
    async (args) =>
      runTool(
        "openrouter_create_byok",
        { provider: args.provider, name: args.name, workspace_id: args.workspace_id },
        () => client.request("POST", "/byok", { body: defined(args) }),
      ),
  );

  server.registerTool(
    "openrouter_update_byok",
    {
      title: "Update BYOK credential",
      description: "Update a BYOK credential. Only passed fields change.",
      inputSchema: {
        id: byokIdSchema,
        ...byokFields,
      },
      annotations: IDEMPOTENT_WRITE,
    },
    async ({ id, ...changes }) =>
      runTool("openrouter_update_byok", { id, name: changes.name }, async () => {
        const body = defined(changes);
        if (Object.keys(body).length === 0) {
          throw new Error("Nothing to update. Pass at least one BYOK field.");
        }
        return client.request("PATCH", `/byok/${encodeURIComponent(id)}`, { body });
      }),
  );

  server.registerTool(
    "openrouter_delete_byok",
    {
      title: "Delete BYOK credential",
      description: "Permanently delete a BYOK provider credential.",
      inputSchema: { id: byokIdSchema, confirm: confirmSchema },
      annotations: DESTRUCTIVE,
    },
    async ({ id }) =>
      runTool("openrouter_delete_byok", { id }, () =>
        client.request("DELETE", `/byok/${encodeURIComponent(id)}`),
      ),
  );
}
