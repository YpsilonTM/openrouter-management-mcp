import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const entry = fileURLToPath(new URL("../dist/index.js", import.meta.url));

async function spawnServer(env: Record<string, string>) {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [entry],
    env: { PATH: process.env.PATH ?? "", OPENROUTER_MGMT_LOG_LEVEL: "error", ...env },
    stderr: "pipe",
  });
  const client = new Client({ name: "stdio-test", version: "0.0.0" });
  await client.connect(transport);
  return client;
}

describe("stdio (built server)", { skip: !existsSync(entry) && "run `npm run build` first" }, () => {
  it("starts without a key and lists tools", async () => {
    const client = await spawnServer({});
    const { tools } = await client.listTools();
    assert.ok(tools.some((t) => t.name === "openrouter_update_key"));

    const res = await client.callTool({ name: "openrouter_get_credits", arguments: {} });
    assert.equal(res.isError, true);
    await client.close();
  });

  const liveKey = process.env.OPENROUTER_MANAGEMENT_API_KEY;
  it("live: read-only calls against OpenRouter", { skip: !liveKey && "OPENROUTER_MANAGEMENT_API_KEY not set" }, async () => {
    const client = await spawnServer({ OPENROUTER_MANAGEMENT_API_KEY: liveKey! });
    for (const name of ["openrouter_get_credits", "openrouter_list_keys", "openrouter_list_workspaces"]) {
      const res = await client.callTool({ name, arguments: {} });
      const text = (res.content as { text: string }[])[0]?.text;
      assert.equal(res.isError, undefined, `${name} failed: ${text}`);
    }
    await client.close();
  });
});
