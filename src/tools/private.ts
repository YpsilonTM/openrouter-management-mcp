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
  workspaceIdSchema,
} from "./common.js";

const endpointIdSchema = z.string().uuid().describe("Private endpoint UUID.");
const providerSlugSchema = z.string().min(1).describe("Private provider slug.");

export function registerPrivateTools(
  server: McpServer,
  client: OpenRouterManagementClient,
): void {
  // --- private providers ---
  server.registerTool(
    "openrouter_list_private_providers",
    {
      title: "List private providers",
      description: "List private providers for the organization.",
      inputSchema: paginationSchema,
      annotations: READ_ONLY,
    },
    async (args) =>
      runTool("openrouter_list_private_providers", args, () =>
        client.request("GET", "/private-providers", { query: args }),
      ),
  );

  server.registerTool(
    "openrouter_get_private_provider",
    {
      title: "Get private provider",
      description: "Get one private provider by slug.",
      inputSchema: { slug: providerSlugSchema },
      annotations: READ_ONLY,
    },
    async ({ slug }) =>
      runTool("openrouter_get_private_provider", { slug }, () =>
        client.request("GET", `/private-providers/${encodeURIComponent(slug)}`),
      ),
  );

  server.registerTool(
    "openrouter_create_private_provider",
    {
      title: "Create private provider",
      description: "Create a private provider.",
      inputSchema: {
        name: z.string().min(1),
        slug: z.string().min(1).optional(),
        display_name: z.string().optional(),
        base_url: z.string().url().optional(),
      },
      annotations: WRITE,
    },
    async (args) =>
      runTool("openrouter_create_private_provider", { name: args.name }, () =>
        client.request("POST", "/private-providers", { body: defined(args) }),
      ),
  );

  server.registerTool(
    "openrouter_update_private_provider",
    {
      title: "Update private provider",
      description: "Update a private provider's display_name or base_url.",
      inputSchema: {
        slug: providerSlugSchema,
        display_name: z.string().optional(),
        base_url: z.string().url().optional(),
      },
      annotations: IDEMPOTENT_WRITE,
    },
    async ({ slug, ...changes }) =>
      runTool("openrouter_update_private_provider", { slug }, async () => {
        const body = defined(changes);
        if (Object.keys(body).length === 0) {
          throw new Error("Nothing to update.");
        }
        return client.request("PATCH", `/private-providers/${encodeURIComponent(slug)}`, {
          body,
        });
      }),
  );

  server.registerTool(
    "openrouter_delete_private_provider",
    {
      title: "Delete private provider",
      description: "Delete a private provider.",
      inputSchema: { slug: providerSlugSchema, confirm: confirmSchema },
      annotations: DESTRUCTIVE,
    },
    async ({ slug }) =>
      runTool("openrouter_delete_private_provider", { slug }, () =>
        client.request("DELETE", `/private-providers/${encodeURIComponent(slug)}`),
      ),
  );

  // --- private endpoints ---
  server.registerTool(
    "openrouter_list_private_endpoints",
    {
      title: "List private endpoints",
      description:
        "List private endpoints including drafts. Requires private-endpoints entitlement.",
      inputSchema: paginationSchema,
      annotations: READ_ONLY,
    },
    async (args) =>
      runTool("openrouter_list_private_endpoints", args, () =>
        client.request("GET", "/private-endpoints", { query: args }),
      ),
  );

  server.registerTool(
    "openrouter_get_private_endpoint",
    {
      title: "Get private endpoint",
      description: "Get one private endpoint by id.",
      inputSchema: { id: endpointIdSchema },
      annotations: READ_ONLY,
    },
    async ({ id }) =>
      runTool("openrouter_get_private_endpoint", { id }, () =>
        client.request("GET", `/private-endpoints/${encodeURIComponent(id)}`),
      ),
  );

  server.registerTool(
    "openrouter_create_private_endpoint",
    {
      title: "Create private endpoint",
      description: "Create a private endpoint draft (or activate immediately if activate=true).",
      inputSchema: {
        model_permaslug: z.string().min(1),
        provider_slug: z.string().min(1),
        upstream_model_id: z.string().min(1),
        activate: z.boolean().optional(),
        base_url: z.string().url().optional(),
        declared_parameters: jsonObject.optional(),
        declared_region: z.string().nullable().optional(),
        declared_zdr: z.boolean().nullable().optional(),
        pricing: jsonObject.optional(),
        settings: jsonObject.optional(),
      },
      annotations: WRITE,
    },
    async (args) =>
      runTool(
        "openrouter_create_private_endpoint",
        { model_permaslug: args.model_permaslug, provider_slug: args.provider_slug },
        () => client.request("POST", "/private-endpoints", { body: defined(args) }),
      ),
  );

  server.registerTool(
    "openrouter_update_private_endpoint",
    {
      title: "Update private endpoint",
      description: "Update a private endpoint. Only passed fields change.",
      inputSchema: {
        id: endpointIdSchema,
        base_url: z.string().url().optional(),
        declared_parameters: jsonObject.optional(),
        declared_region: z.string().nullable().optional(),
        declared_zdr: z.boolean().nullable().optional(),
        pricing: jsonObject.optional(),
        settings: jsonObject.optional(),
        upstream_model_id: z.string().min(1).optional(),
      },
      annotations: IDEMPOTENT_WRITE,
    },
    async ({ id, ...changes }) =>
      runTool("openrouter_update_private_endpoint", { id }, async () => {
        const body = defined(changes);
        if (Object.keys(body).length === 0) {
          throw new Error("Nothing to update.");
        }
        return client.request("PATCH", `/private-endpoints/${encodeURIComponent(id)}`, {
          body,
        });
      }),
  );

  server.registerTool(
    "openrouter_delete_private_endpoint",
    {
      title: "Delete private endpoint",
      description: "Delete a private endpoint. Set draft_only=true to only delete drafts.",
      inputSchema: {
        id: endpointIdSchema,
        confirm: confirmSchema,
        draft_only: z.boolean().optional(),
      },
      annotations: DESTRUCTIVE,
    },
    async ({ id, draft_only }) =>
      runTool("openrouter_delete_private_endpoint", { id }, () =>
        client.request("DELETE", `/private-endpoints/${encodeURIComponent(id)}`, {
          query: {
            draft_only:
              draft_only === undefined ? undefined : draft_only ? "true" : "false",
          },
        }),
      ),
  );

  server.registerTool(
    "openrouter_validate_private_endpoint",
    {
      title: "Validate private endpoint",
      description: "Validate a draft private endpoint against a workspace.",
      inputSchema: {
        id: endpointIdSchema,
        workspace_id: workspaceIdSchema,
      },
      annotations: WRITE,
    },
    async ({ id, workspace_id }) =>
      runTool("openrouter_validate_private_endpoint", { id, workspace_id }, () =>
        client.request(
          "POST",
          `/private-endpoints/${encodeURIComponent(id)}/validate`,
          { body: { workspace_id } },
        ),
      ),
  );

  server.registerTool(
    "openrouter_activate_private_endpoint",
    {
      title: "Activate private endpoint",
      description: "Activate a validated private endpoint.",
      inputSchema: { id: endpointIdSchema },
      annotations: WRITE,
    },
    async ({ id }) =>
      runTool("openrouter_activate_private_endpoint", { id }, () =>
        client.request("POST", `/private-endpoints/${encodeURIComponent(id)}/activate`),
      ),
  );

  server.registerTool(
    "openrouter_enable_private_endpoint",
    {
      title: "Enable private endpoint",
      description: "Enable a disabled private endpoint.",
      inputSchema: { id: endpointIdSchema },
      annotations: IDEMPOTENT_WRITE,
    },
    async ({ id }) =>
      runTool("openrouter_enable_private_endpoint", { id }, () =>
        client.request("POST", `/private-endpoints/${encodeURIComponent(id)}/enable`),
      ),
  );

  server.registerTool(
    "openrouter_disable_private_endpoint",
    {
      title: "Disable private endpoint",
      description: "Disable a private endpoint.",
      inputSchema: { id: endpointIdSchema, confirm: confirmSchema },
      annotations: DESTRUCTIVE,
    },
    async ({ id }) =>
      runTool("openrouter_disable_private_endpoint", { id }, () =>
        client.request("POST", `/private-endpoints/${encodeURIComponent(id)}/disable`),
      ),
  );
}
