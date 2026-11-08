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
  dataRegionsSchema,
  defined,
  guardrailResetSchema,
  paginationSchema,
  stringListNullable,
  workspaceIdSchema,
} from "./common.js";

const guardrailIdSchema = z
  .string()
  .uuid()
  .describe("Guardrail UUID (from openrouter_list_guardrails).");

const contentFiltersSchema = z
  .array(z.record(z.unknown()))
  .nullable()
  .optional()
  .describe("Content filter configs (see OpenRouter guardrail docs).");

const guardrailFields = {
  name: z.string().min(1).max(200).optional(),
  allow_safety_retention_google: z.boolean().nullable().optional(),
  allow_safety_retention_other: z.boolean().nullable().optional(),
  allowed_data_regions: dataRegionsSchema,
  allowed_models: stringListNullable.describe(
    "Allow-list of model slugs; null clears. Min 1 item when set.",
  ),
  allowed_providers: stringListNullable.describe(
    "Allow-list of provider IDs; null clears.",
  ),
  ignored_models: stringListNullable,
  ignored_providers: stringListNullable,
  content_filter_builtins: contentFiltersSchema,
  content_filters: contentFiltersSchema,
  enable_free_model_publication: z.boolean().nullable().optional(),
  enable_free_model_training: z.boolean().nullable().optional(),
  enable_paid_model_training: z.boolean().nullable().optional(),
  enforce_first_party_harness_models: z.boolean().nullable().optional(),
  enforce_zdr: z.boolean().nullable().optional(),
  enforce_zdr_anthropic: z.boolean().optional(),
  enforce_zdr_google: z.boolean().optional(),
  enforce_zdr_openai: z.boolean().optional(),
  enforce_zdr_other: z.boolean().optional(),
  enforce_zdr_xai: z.boolean().optional(),
  include_byok_in_budgets: z
    .boolean()
    .optional()
    .describe("Count BYOK spend toward this guardrail's limit_usd."),
  limit_usd: z
    .number()
    .min(0)
    .nullable()
    .optional()
    .describe("Spend limit USD; must be paired with reset_interval."),
  reset_interval: guardrailResetSchema,
};

export function registerGuardrailTools(
  server: McpServer,
  client: OpenRouterManagementClient,
): void {
  server.registerTool(
    "openrouter_list_guardrails",
    {
      title: "List guardrails",
      description:
        "List guardrails in a workspace (defaults to the account default workspace). A guardrail only enforces rules once assigned to keys/members, or when set as the workspace default.",
      inputSchema: {
        ...paginationSchema,
        workspace_id: workspaceIdSchema.optional(),
      },
      annotations: READ_ONLY,
    },
    async (args) =>
      runTool("openrouter_list_guardrails", args, () =>
        client.request("GET", "/guardrails", { query: args }),
      ),
  );

  server.registerTool(
    "openrouter_get_guardrail",
    {
      title: "Get guardrail",
      description: "Get one guardrail by UUID.",
      inputSchema: { id: guardrailIdSchema },
      annotations: READ_ONLY,
    },
    async ({ id }) =>
      runTool("openrouter_get_guardrail", { id }, () =>
        client.request("GET", `/guardrails/${encodeURIComponent(id)}`),
      ),
  );

  server.registerTool(
    "openrouter_create_guardrail",
    {
      title: "Create guardrail",
      description:
        "Create a guardrail. It enforces nothing until assigned to keys/members; workspace_id only places it in that workspace. To restrict all workspace traffic, update the workspace default guardrail instead.",
      inputSchema: {
        name: z.string().min(1).max(200).describe("Guardrail name."),
        workspace_id: workspaceIdSchema
          .optional()
          .describe("Workspace to place the guardrail in (does not auto-apply it)."),
        allow_safety_retention_google: guardrailFields.allow_safety_retention_google,
        allow_safety_retention_other: guardrailFields.allow_safety_retention_other,
        allowed_data_regions: guardrailFields.allowed_data_regions,
        allowed_models: guardrailFields.allowed_models,
        allowed_providers: guardrailFields.allowed_providers,
        ignored_models: guardrailFields.ignored_models,
        ignored_providers: guardrailFields.ignored_providers,
        content_filter_builtins: guardrailFields.content_filter_builtins,
        content_filters: guardrailFields.content_filters,
        enable_free_model_publication: guardrailFields.enable_free_model_publication,
        enable_free_model_training: guardrailFields.enable_free_model_training,
        enable_paid_model_training: guardrailFields.enable_paid_model_training,
        enforce_first_party_harness_models:
          guardrailFields.enforce_first_party_harness_models,
        enforce_zdr: guardrailFields.enforce_zdr,
        enforce_zdr_anthropic: guardrailFields.enforce_zdr_anthropic,
        enforce_zdr_google: guardrailFields.enforce_zdr_google,
        enforce_zdr_openai: guardrailFields.enforce_zdr_openai,
        enforce_zdr_other: guardrailFields.enforce_zdr_other,
        enforce_zdr_xai: guardrailFields.enforce_zdr_xai,
        include_byok_in_budgets: guardrailFields.include_byok_in_budgets,
        limit_usd: guardrailFields.limit_usd,
        reset_interval: guardrailFields.reset_interval,
      },
      annotations: WRITE,
    },
    async (args) =>
      runTool("openrouter_create_guardrail", { name: args.name }, () =>
        client.request("POST", "/guardrails", { body: defined(args) }),
      ),
  );

  server.registerTool(
    "openrouter_update_guardrail",
    {
      title: "Update guardrail",
      description:
        "Update a guardrail. Only passed fields change. Pass null on list fields to clear them.",
      inputSchema: {
        id: guardrailIdSchema,
        ...guardrailFields,
      },
      annotations: IDEMPOTENT_WRITE,
    },
    async ({ id, ...changes }) =>
      runTool("openrouter_update_guardrail", { id, ...changes }, async () => {
        const body = defined(changes);
        if (Object.keys(body).length === 0) {
          throw new Error("Nothing to update. Pass at least one guardrail field.");
        }
        return client.request("PATCH", `/guardrails/${encodeURIComponent(id)}`, { body });
      }),
  );

  server.registerTool(
    "openrouter_delete_guardrail",
    {
      title: "Delete guardrail",
      description: "Permanently delete a guardrail.",
      inputSchema: { id: guardrailIdSchema, confirm: confirmSchema },
      annotations: DESTRUCTIVE,
    },
    async ({ id }) =>
      runTool("openrouter_delete_guardrail", { id }, () =>
        client.request("DELETE", `/guardrails/${encodeURIComponent(id)}`),
      ),
  );

  server.registerTool(
    "openrouter_list_guardrail_key_assignments",
    {
      title: "List key assignments for a guardrail",
      description: "List API key hashes assigned to one guardrail.",
      inputSchema: { id: guardrailIdSchema, ...paginationSchema },
      annotations: READ_ONLY,
    },
    async ({ id, ...query }) =>
      runTool("openrouter_list_guardrail_key_assignments", { id, ...query }, () =>
        client.request("GET", `/guardrails/${encodeURIComponent(id)}/assignments/keys`, {
          query,
        }),
      ),
  );

  server.registerTool(
    "openrouter_assign_guardrail_keys",
    {
      title: "Assign keys to a guardrail",
      description: "Bulk-assign API keys (by hash) to a guardrail.",
      inputSchema: {
        id: guardrailIdSchema,
        key_hashes: z.array(z.string().min(1)).min(1),
      },
      annotations: WRITE,
    },
    async ({ id, key_hashes }) =>
      runTool("openrouter_assign_guardrail_keys", { id, count: key_hashes.length }, () =>
        client.request("POST", `/guardrails/${encodeURIComponent(id)}/assignments/keys`, {
          body: { key_hashes },
        }),
      ),
  );

  server.registerTool(
    "openrouter_unassign_guardrail_keys",
    {
      title: "Unassign keys from a guardrail",
      description: "Bulk-unassign API keys from a guardrail.",
      inputSchema: {
        id: guardrailIdSchema,
        key_hashes: z.array(z.string().min(1)).min(1),
        confirm: confirmSchema,
      },
      annotations: DESTRUCTIVE,
    },
    async ({ id, key_hashes }) =>
      runTool("openrouter_unassign_guardrail_keys", { id, count: key_hashes.length }, () =>
        client.request(
          "POST",
          `/guardrails/${encodeURIComponent(id)}/assignments/keys/remove`,
          { body: { key_hashes } },
        ),
      ),
  );

  server.registerTool(
    "openrouter_list_guardrail_member_assignments",
    {
      title: "List member assignments for a guardrail",
      description: "List organization members assigned to one guardrail.",
      inputSchema: { id: guardrailIdSchema, ...paginationSchema },
      annotations: READ_ONLY,
    },
    async ({ id, ...query }) =>
      runTool("openrouter_list_guardrail_member_assignments", { id, ...query }, () =>
        client.request(
          "GET",
          `/guardrails/${encodeURIComponent(id)}/assignments/members`,
          { query },
        ),
      ),
  );

  server.registerTool(
    "openrouter_assign_guardrail_members",
    {
      title: "Assign members to a guardrail",
      description: "Bulk-assign organization members to a guardrail.",
      inputSchema: {
        id: guardrailIdSchema,
        member_user_ids: z.array(z.string().min(1)).min(1),
      },
      annotations: WRITE,
    },
    async ({ id, member_user_ids }) =>
      runTool(
        "openrouter_assign_guardrail_members",
        { id, count: member_user_ids.length },
        () =>
          client.request(
            "POST",
            `/guardrails/${encodeURIComponent(id)}/assignments/members`,
            { body: { member_user_ids } },
          ),
      ),
  );

  server.registerTool(
    "openrouter_unassign_guardrail_members",
    {
      title: "Unassign members from a guardrail",
      description: "Bulk-unassign organization members from a guardrail.",
      inputSchema: {
        id: guardrailIdSchema,
        member_user_ids: z.array(z.string().min(1)).min(1),
        confirm: confirmSchema,
      },
      annotations: DESTRUCTIVE,
    },
    async ({ id, member_user_ids }) =>
      runTool(
        "openrouter_unassign_guardrail_members",
        { id, count: member_user_ids.length },
        () =>
          client.request(
            "POST",
            `/guardrails/${encodeURIComponent(id)}/assignments/members/remove`,
            { body: { member_user_ids } },
          ),
      ),
  );

  server.registerTool(
    "openrouter_list_all_key_guardrail_assignments",
    {
      title: "List all key guardrail assignments",
      description: "List every API-key → guardrail assignment across the account.",
      inputSchema: paginationSchema,
      annotations: READ_ONLY,
    },
    async (args) =>
      runTool("openrouter_list_all_key_guardrail_assignments", args, () =>
        client.request("GET", "/guardrails/assignments/keys", { query: args }),
      ),
  );

  server.registerTool(
    "openrouter_list_all_member_guardrail_assignments",
    {
      title: "List all member guardrail assignments",
      description: "List every member → guardrail assignment across the account.",
      inputSchema: paginationSchema,
      annotations: READ_ONLY,
    },
    async (args) =>
      runTool("openrouter_list_all_member_guardrail_assignments", args, () =>
        client.request("GET", "/guardrails/assignments/members", { query: args }),
      ),
  );
}
