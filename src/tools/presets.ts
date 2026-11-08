import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { OpenRouterManagementClient } from "../client.js";
import { WRITE, runTool } from "./helpers.js";
import { jsonObject, workspaceIdSchema } from "./common.js";

const slugSchema = z
  .string()
  .min(1)
  .describe("Preset slug to create or overwrite.");

function registerPresetCreate(
  server: McpServer,
  client: OpenRouterManagementClient,
  name: string,
  title: string,
  pathSuffix: string,
  description: string,
): void {
  server.registerTool(
    name,
    {
      title,
      description,
      inputSchema: {
        slug: slugSchema,
        workspace_id: workspaceIdSchema.optional(),
        body: jsonObject.describe(
          `Full request body matching OpenRouter ${pathSuffix} (model, messages/input, parameters, etc.).`,
        ),
      },
      annotations: WRITE,
    },
    async ({ slug, workspace_id, body }) =>
      runTool(name, { slug, workspace_id }, () =>
        client.request("POST", `/presets/${encodeURIComponent(slug)}/${pathSuffix}`, {
          query: { workspace_id },
          body,
        }),
      ),
  );
}

export function registerPresetTools(
  server: McpServer,
  client: OpenRouterManagementClient,
): void {
  registerPresetCreate(
    server,
    client,
    "openrouter_create_preset_chat_completions",
    "Create preset from chat/completions body",
    "chat/completions",
    "Create or overwrite a preset from a chat-completions-shaped request body. Management key required.",
  );
  registerPresetCreate(
    server,
    client,
    "openrouter_create_preset_messages",
    "Create preset from messages body",
    "messages",
    "Create or overwrite a preset from an Anthropic-style messages request body. Management key required.",
  );
  registerPresetCreate(
    server,
    client,
    "openrouter_create_preset_responses",
    "Create preset from responses body",
    "responses",
    "Create or overwrite a preset from a Responses API request body. Management key required.",
  );
}
