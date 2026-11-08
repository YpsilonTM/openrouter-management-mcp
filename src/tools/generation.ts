import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { OpenRouterManagementClient } from "../client.js";
import { WRITE, runTool } from "./helpers.js";
import { defined } from "./common.js";

export function registerGenerationTools(
  server: McpServer,
  client: OpenRouterManagementClient,
): void {
  server.registerTool(
    "openrouter_submit_generation_feedback",
    {
      title: "Submit generation feedback",
      description: "Submit thumbs-up/down (or category) feedback for a generation id.",
      inputSchema: {
        generation_id: z.string().min(1),
        category: z.string().min(1).describe("Feedback category (see OpenRouter docs)."),
        comment: z.string().optional(),
      },
      annotations: WRITE,
    },
    async (args) =>
      runTool("openrouter_submit_generation_feedback", { generation_id: args.generation_id }, () =>
        client.request("POST", "/generation/feedback", { body: defined(args) }),
      ),
  );
}
