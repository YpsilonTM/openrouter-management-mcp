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
import { registerGuardrailTools } from "./tools/guardrails.js";
import { registerGuardrailPolicyTools } from "./tools/guardrail-policies.js";
import { registerByokTools } from "./tools/byok.js";
import { registerOrganizationTools } from "./tools/organization.js";
import { registerObservabilityTools } from "./tools/observability.js";
import { registerExternalUserTools } from "./tools/external-users.js";
import { registerPrivateTools } from "./tools/private.js";
import { registerScimTools } from "./tools/scim.js";
import { registerAnalyticsTools } from "./tools/analytics.js";
import { registerPresetTools } from "./tools/presets.js";
import { registerGenerationTools } from "./tools/generation.js";

export const SERVER_NAME = "openrouter-management-mcp";
export const SERVER_VERSION = "2.0.0";

export function createServer(client: OpenRouterManagementClient): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      instructions:
        "Manages an OpenRouter account via the Management API (requires OPENROUTER_MANAGEMENT_API_KEY). Covers: API keys, workspaces (+ members/budgets), guardrails (+ assignments), guardrail policies, BYOK, org members/settings, observability destinations, external users, private providers/endpoints, SCIM, analytics, presets, credits/activity, generation feedback. Keys are identified by `hash`, never the sk-or-... secret. Prefer disabling keys over deleting. Destructive tools require confirm=true.",
    },
  );

  registerKeyTools(server, client);
  registerWorkspaceTools(server, client);
  registerAccountTools(server, client);
  registerGuardrailTools(server, client);
  registerGuardrailPolicyTools(server, client);
  registerByokTools(server, client);
  registerOrganizationTools(server, client);
  registerObservabilityTools(server, client);
  registerExternalUserTools(server, client);
  registerPrivateTools(server, client);
  registerScimTools(server, client);
  registerAnalyticsTools(server, client);
  registerPresetTools(server, client);
  registerGenerationTools(server, client);

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
