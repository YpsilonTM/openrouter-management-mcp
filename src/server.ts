import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  createClientFromEnv,
  type OpenRouterManagementClient,
} from "./client.js";
import { log, getLogLevel } from "./log.js";
import { registerKeyTools } from "./tools/keys.js";
import { registerWorkspaceTools } from "./tools/workspaces.js";
import { registerAccountTools } from "./tools/account.js";

export const SERVER_NAME = "openrouter-management-mcp";
export const SERVER_VERSION = "1.1.0";

export function createServer(client: OpenRouterManagementClient): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      instructions:
        "Manages an OpenRouter account via the Management API: inference API keys (per-key USD spend limits, disable, create, delete), workspace budgets, credits, and usage activity. Keys are identified by `hash`, never by the sk-or-... secret. To change a key, find it with openrouter_list_keys (name_contains) first. Prefer disabling over deleting.",
    },
  );

  registerKeyTools(server, client);
  registerWorkspaceTools(server, client);
  registerAccountTools(server, client);

  return server;
}

export async function startMcpServer(): Promise<void> {
  const client = createClientFromEnv();

  log.info("Starting OpenRouter Management MCP", {
    version: SERVER_VERSION,
    logLevel: getLogLevel(),
    managementKeyConfigured: client.configured,
  });
  if (!client.configured) {
    log.warn(
      "OPENROUTER_MANAGEMENT_API_KEY is not set; tools will return an error until it is configured",
    );
  }

  const server = createServer(client);
  await server.connect(new StdioServerTransport());
  log.info("MCP server connected on stdio");
}
