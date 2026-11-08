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
  jsonObject,
  paginationSchema,
  policyTypeSchema,
  uuidList,
  uuidSchema,
  workspaceIdSchema,
} from "./common.js";

const policyIdSchema = z.string().uuid().describe("Policy UUID.");

const scopedPolicyFields = {
  name: z.string().min(1).max(255),
  config: jsonObject.describe(
    "Policy config object (shape depends on policy_type; see OpenRouter docs / openrouter_list_*_policies examples).",
  ),
  workspace_id: workspaceIdSchema,
  api_key_hashes: z.array(z.string().min(1)).optional(),
  member_ids: z.array(z.string().min(1)).optional(),
  opted_out_api_key_hashes: z.array(z.string().min(1)).optional(),
  opted_out_member_ids: z.array(z.string().min(1)).optional(),
  is_workspace_default: z.boolean().optional(),
};

type ScopedKind = "budget" | "moderation" | "model-availability";

const SCOPED: {
  kind: ScopedKind;
  policyType: "budget" | "moderation" | "model_availability";
  label: string;
}[] = [
  { kind: "budget", policyType: "budget", label: "budget" },
  { kind: "moderation", policyType: "moderation", label: "moderation" },
  {
    kind: "model-availability",
    policyType: "model_availability",
    label: "model availability",
  },
];

function registerScopedPolicyTools(
  server: McpServer,
  client: OpenRouterManagementClient,
  kind: ScopedKind,
  policyType: "budget" | "moderation" | "model_availability",
  label: string,
): void {
  const base = `/guardrails/policies/${kind}`;
  const listName = `openrouter_list_${kind.replace(/-/g, "_")}_policies`;
  const getName = `openrouter_get_${kind.replace(/-/g, "_")}_policy`;
  const createName = `openrouter_create_${kind.replace(/-/g, "_")}_policy`;
  const updateName = `openrouter_update_${kind.replace(/-/g, "_")}_policy`;
  const deleteName = `openrouter_delete_${kind.replace(/-/g, "_")}_policy`;

  server.registerTool(
    listName,
    {
      title: `List ${label} policies`,
      description: `List workspace ${label} guardrail policies. Requires workspace_id.`,
      inputSchema: {
        workspace_id: workspaceIdSchema,
        ...paginationSchema,
      },
      annotations: READ_ONLY,
    },
    async (args) =>
      runTool(listName, args, () => client.request("GET", base, { query: args })),
  );

  server.registerTool(
    getName,
    {
      title: `Get ${label} policy`,
      description: `Get one ${label} policy by id.`,
      inputSchema: {
        id: policyIdSchema,
        workspace_id: workspaceIdSchema,
      },
      annotations: READ_ONLY,
    },
    async ({ id, workspace_id }) =>
      runTool(getName, { id, workspace_id }, () =>
        client.request("GET", `${base}/${encodeURIComponent(id)}`, {
          query: { workspace_id },
        }),
      ),
  );

  server.registerTool(
    createName,
    {
      title: `Create ${label} policy`,
      description: `Create a ${label} guardrail policy in a workspace.`,
      inputSchema: {
        ...scopedPolicyFields,
        policy_type: z
          .literal(policyType)
          .describe(`Must be "${policyType}".`),
      },
      annotations: WRITE,
    },
    async (args) =>
      runTool(createName, { name: args.name, workspace_id: args.workspace_id }, () =>
        client.request("POST", base, { body: defined(args) }),
      ),
  );

  server.registerTool(
    updateName,
    {
      title: `Update ${label} policy`,
      description: `Replace a ${label} policy (PUT).`,
      inputSchema: {
        id: policyIdSchema,
        name: scopedPolicyFields.name,
        config: scopedPolicyFields.config,
        workspace_id: scopedPolicyFields.workspace_id,
        api_key_hashes: scopedPolicyFields.api_key_hashes,
        member_ids: scopedPolicyFields.member_ids,
        opted_out_api_key_hashes: scopedPolicyFields.opted_out_api_key_hashes,
        opted_out_member_ids: scopedPolicyFields.opted_out_member_ids,
        is_workspace_default: scopedPolicyFields.is_workspace_default,
      },
      annotations: IDEMPOTENT_WRITE,
    },
    async ({ id, ...body }) =>
      runTool(updateName, { id, name: body.name }, () =>
        client.request("PUT", `${base}/${encodeURIComponent(id)}`, {
          body: defined(body),
        }),
      ),
  );

  server.registerTool(
    deleteName,
    {
      title: `Delete ${label} policy`,
      description: `Delete a ${label} policy.`,
      inputSchema: {
        id: policyIdSchema,
        workspace_id: workspaceIdSchema,
        confirm: confirmSchema,
      },
      annotations: DESTRUCTIVE,
    },
    async ({ id, workspace_id }) =>
      runTool(deleteName, { id, workspace_id }, () =>
        client.request("DELETE", `${base}/${encodeURIComponent(id)}`, {
          query: { workspace_id },
        }),
      ),
  );
}

export function registerGuardrailPolicyTools(
  server: McpServer,
  client: OpenRouterManagementClient,
): void {
  server.registerTool(
    "openrouter_list_account_policies",
    {
      title: "List workspace-wide (account) policies",
      description:
        "List account-level / workspace-wide guardrail policies (floors applied across workspaces).",
      inputSchema: paginationSchema,
      annotations: READ_ONLY,
    },
    async (args) =>
      runTool("openrouter_list_account_policies", args, () =>
        client.request("GET", "/guardrails/policies/account", { query: args }),
      ),
  );

  server.registerTool(
    "openrouter_create_account_policy",
    {
      title: "Create workspace-wide policy",
      description:
        "Create an account-level policy. policy_type + config shape must match OpenRouter (budget / model_availability / moderation / rate_limit). Pass config as a JSON object.",
      inputSchema: {
        name: z.string().min(1).max(255),
        policy_type: policyTypeSchema,
        config: jsonObject,
        is_default: z.boolean().optional(),
        keep_previous_default_workspaces: z.boolean().optional(),
        workspace_ids: uuidList,
        opted_out_workspace_ids: uuidList,
        released_floor_workspace_ids: uuidList,
        floor_reassignment: z
          .object({
            policy_id: uuidSchema,
            workspace_ids: z.array(uuidSchema).min(1),
          })
          .optional(),
      },
      annotations: WRITE,
    },
    async (args) =>
      runTool("openrouter_create_account_policy", { name: args.name }, () =>
        client.request("POST", "/guardrails/policies/account", {
          body: defined(args),
        }),
      ),
  );

  server.registerTool(
    "openrouter_update_account_policy",
    {
      title: "Update workspace-wide policy",
      description: "Replace an account-level policy (PUT).",
      inputSchema: {
        id: policyIdSchema,
        name: z.string().min(1).max(255),
        policy_type: policyTypeSchema,
        config: jsonObject,
        is_default: z.boolean().optional(),
        keep_previous_default_workspaces: z.boolean().optional(),
        workspace_ids: uuidList,
        opted_out_workspace_ids: uuidList,
        released_floor_workspace_ids: uuidList,
        floor_reassignment: z
          .object({
            policy_id: uuidSchema,
            workspace_ids: z.array(uuidSchema).min(1),
          })
          .optional(),
      },
      annotations: IDEMPOTENT_WRITE,
    },
    async ({ id, ...body }) =>
      runTool("openrouter_update_account_policy", { id, name: body.name }, () =>
        client.request("PUT", `/guardrails/policies/account/${encodeURIComponent(id)}`, {
          body: defined(body),
        }),
      ),
  );

  server.registerTool(
    "openrouter_delete_account_policy",
    {
      title: "Delete workspace-wide policy",
      description: "Delete an account-level policy.",
      inputSchema: { id: policyIdSchema, confirm: confirmSchema },
      annotations: DESTRUCTIVE,
    },
    async ({ id }) =>
      runTool("openrouter_delete_account_policy", { id }, () =>
        client.request(
          "DELETE",
          `/guardrails/policies/account/${encodeURIComponent(id)}`,
        ),
      ),
  );

  for (const { kind, policyType, label } of SCOPED) {
    registerScopedPolicyTools(server, client, kind, policyType, label);
  }

  const assignmentBody = {
    workspace_id: workspaceIdSchema,
    policy_type: policyTypeSchema,
    policy_id: policyIdSchema,
    assigned: z
      .boolean()
      .describe("true assigns this policy; false clears that type for the subject."),
    expected_assignment: z
      .boolean()
      .describe("Optimistic concurrency: expected current assigned state."),
  };

  server.registerTool(
    "openrouter_get_api_key_policy_assignment",
    {
      title: "Get API key policy assignment",
      description: "Get which policy of a given type is assigned to an API key.",
      inputSchema: {
        hash: z.string().min(1).describe("API key hash."),
        workspace_id: workspaceIdSchema,
        policy_type: policyTypeSchema,
      },
      annotations: READ_ONLY,
    },
    async ({ hash, workspace_id, policy_type }) =>
      runTool(
        "openrouter_get_api_key_policy_assignment",
        { hash, workspace_id, policy_type },
        () =>
          client.request(
            "GET",
            `/guardrails/policies/assignments/api-keys/${encodeURIComponent(hash)}`,
            { query: { workspace_id, policy_type } },
          ),
      ),
  );

  server.registerTool(
    "openrouter_set_api_key_policy_assignment",
    {
      title: "Set API key policy assignment",
      description: "Assign or clear a policy of one type on an API key.",
      inputSchema: {
        hash: z.string().min(1).describe("API key hash."),
        ...assignmentBody,
      },
      annotations: IDEMPOTENT_WRITE,
    },
    async ({ hash, ...body }) =>
      runTool("openrouter_set_api_key_policy_assignment", { hash, ...body }, () =>
        client.request(
          "PUT",
          `/guardrails/policies/assignments/api-keys/${encodeURIComponent(hash)}`,
          { body },
        ),
      ),
  );

  server.registerTool(
    "openrouter_get_member_policy_assignment",
    {
      title: "Get member policy assignment",
      description: "Get which policy of a given type is assigned to an org member.",
      inputSchema: {
        member_id: z.string().min(1).describe("Member user id."),
        workspace_id: workspaceIdSchema,
        policy_type: policyTypeSchema,
      },
      annotations: READ_ONLY,
    },
    async ({ member_id, workspace_id, policy_type }) =>
      runTool(
        "openrouter_get_member_policy_assignment",
        { member_id, workspace_id, policy_type },
        () =>
          client.request(
            "GET",
            `/guardrails/policies/assignments/members/${encodeURIComponent(member_id)}`,
            { query: { workspace_id, policy_type } },
          ),
      ),
  );

  server.registerTool(
    "openrouter_set_member_policy_assignment",
    {
      title: "Set member policy assignment",
      description: "Assign or clear a policy of one type on an organization member.",
      inputSchema: {
        member_id: z.string().min(1).describe("Member user id."),
        ...assignmentBody,
      },
      annotations: IDEMPOTENT_WRITE,
    },
    async ({ member_id, ...body }) =>
      runTool("openrouter_set_member_policy_assignment", { member_id, ...body }, () =>
        client.request(
          "PUT",
          `/guardrails/policies/assignments/members/${encodeURIComponent(member_id)}`,
          { body },
        ),
      ),
  );
}
