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
  jsonObject,
  paginationSchema,
  workspaceIdSchema,
} from "./common.js";

const destIdSchema = z.string().uuid().describe("Observability destination UUID.");

const destFields = {
  name: z.string().min(1).optional(),
  type: z.string().min(1).optional().describe("Destination type slug from OpenRouter."),
  config: jsonObject.optional().describe("Provider-specific config object."),
  enabled: z.boolean().optional(),
  api_key_hashes: z.array(z.string().min(1)).nullable().optional(),
  broadcast_generation_cost: z.boolean().optional(),
  broadcast_generation_cost_allocation: z.boolean().optional(),
  broadcast_generation_identity: z.boolean().optional(),
  broadcast_generation_request_context: z.boolean().optional(),
  filter_rules: z.array(z.record(z.unknown())).nullable().optional(),
  privacy_mode: z.string().optional(),
  regions: dataRegionsSchema,
  sampling_rate: z.number().min(0).max(1).optional(),
};

export function registerObservabilityTools(
  server: McpServer,
  client: OpenRouterManagementClient,
): void {
  server.registerTool(
    "openrouter_list_observability_destinations",
    {
      title: "List observability destinations",
      description: "List observability destinations for a workspace.",
      inputSchema: {
        ...paginationSchema,
        workspace_id: workspaceIdSchema.optional(),
      },
      annotations: READ_ONLY,
    },
    async (args) =>
      runTool("openrouter_list_observability_destinations", args, () =>
        client.request("GET", "/observability/destinations", { query: args }),
      ),
  );

  server.registerTool(
    "openrouter_get_observability_destination",
    {
      title: "Get observability destination",
      description: "Get one observability destination by id.",
      inputSchema: { id: destIdSchema },
      annotations: READ_ONLY,
    },
    async ({ id }) =>
      runTool("openrouter_get_observability_destination", { id }, () =>
        client.request("GET", `/observability/destinations/${encodeURIComponent(id)}`),
      ),
  );

  server.registerTool(
    "openrouter_create_observability_destination",
    {
      title: "Create observability destination",
      description: "Create an observability destination (type + name + config required).",
      inputSchema: {
        type: z.string().min(1),
        name: z.string().min(1),
        config: jsonObject,
        workspace_id: workspaceIdSchema.optional(),
        enabled: destFields.enabled,
        api_key_hashes: destFields.api_key_hashes,
        broadcast_generation_cost: destFields.broadcast_generation_cost,
        broadcast_generation_cost_allocation:
          destFields.broadcast_generation_cost_allocation,
        broadcast_generation_identity: destFields.broadcast_generation_identity,
        broadcast_generation_request_context:
          destFields.broadcast_generation_request_context,
        filter_rules: destFields.filter_rules,
        privacy_mode: destFields.privacy_mode,
        regions: destFields.regions,
        sampling_rate: destFields.sampling_rate,
      },
      annotations: WRITE,
    },
    async (args) =>
      runTool("openrouter_create_observability_destination", { name: args.name }, () =>
        client.request("POST", "/observability/destinations", { body: defined(args) }),
      ),
  );

  server.registerTool(
    "openrouter_update_observability_destination",
    {
      title: "Update observability destination",
      description: "Update an observability destination. Only passed fields change.",
      inputSchema: {
        id: destIdSchema,
        ...destFields,
      },
      annotations: IDEMPOTENT_WRITE,
    },
    async ({ id, ...changes }) =>
      runTool("openrouter_update_observability_destination", { id }, async () => {
        const body = defined(changes);
        if (Object.keys(body).length === 0) {
          throw new Error("Nothing to update.");
        }
        return client.request(
          "PATCH",
          `/observability/destinations/${encodeURIComponent(id)}`,
          { body },
        );
      }),
  );

  server.registerTool(
    "openrouter_delete_observability_destination",
    {
      title: "Delete observability destination",
      description: "Delete an observability destination.",
      inputSchema: { id: destIdSchema, confirm: confirmSchema },
      annotations: DESTRUCTIVE,
    },
    async ({ id }) =>
      runTool("openrouter_delete_observability_destination", { id }, () =>
        client.request(
          "DELETE",
          `/observability/destinations/${encodeURIComponent(id)}`,
        ),
      ),
  );
}
