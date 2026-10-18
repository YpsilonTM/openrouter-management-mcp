# openrouter-management-mcp

MCP server (stdio) for the [OpenRouter Management API](https://openrouter.ai/docs/guides/overview/auth/management-api-keys): manage inference API keys and their spend limits, workspace budgets, credits, and usage activity.

This is separate from the official OpenRouter MCP (model catalog, test messages), which cannot change account settings.

## Setup

1. Create a **Management API key** at [openrouter.ai/settings/management-keys](https://openrouter.ai/settings/management-keys). Set an expiration; a leaked management key can create and delete all your keys. It cannot be used for completions.
2. Add it to the env file the MCP server loads (here `~/.config/ypsilon/mcp.env`):

   ```bash
   OPENROUTER_MANAGEMENT_API_KEY=sk-or-v1-...
   ```

3. Build:

   ```bash
   npm install
   npm run build
   ```

4. Register in `~/.cursor/mcp.json`:

   ```json
   "openrouter-management": {
     "command": "node",
     "args": ["/home/ypsilon/development/tools/openrouter-management-mcp/dist/index.js"],
     "envFile": "/home/ypsilon/.config/ypsilon/mcp.env"
   }
   ```

The server starts without a key; tools then return a setup error instead of the server failing to load.

## Tools

| Tool | Purpose |
|------|---------|
| `openrouter_list_keys` | List keys with limits and usage; `name_contains` searches all pages |
| `openrouter_get_key` | One key by hash |
| `openrouter_create_key` | New key with optional limit, reset interval, expiry, workspace |
| `openrouter_update_key` | Set/remove spend limit, rename, disable/enable, move workspace |
| `openrouter_delete_key` | Permanently delete (`confirm: true`) |
| `openrouter_list_workspaces` | Workspaces (keys and budgets are workspace-scoped) |
| `openrouter_list_workspace_budgets` | Workspace-wide spend caps |
| `openrouter_set_workspace_budget` | Upsert daily/weekly/monthly/lifetime budget |
| `openrouter_delete_workspace_budget` | Remove a budget (`confirm: true`) |
| `openrouter_get_credits` | Purchased, used, remaining |
| `openrouter_get_activity` | Last 30 days of spend by date/model/endpoint, filterable per key |

Keys are identified by their `hash`, never by the `sk-or-...` secret. `limit_reset: "none"` and `limit: null` clear the reset interval and limit.

## Environment

| Variable | Default | |
|----------|---------|---|
| `OPENROUTER_MANAGEMENT_API_KEY` | — | Required for tool calls |
| `OPENROUTER_MGMT_LOG_LEVEL` | `info` | `error`/`warn`/`info`/`debug`, to stderr |
| `OPENROUTER_BASE_URL` | `https://openrouter.ai/api/v1` | |

## Development

```bash
npm run typecheck
npm test     # builds, runs unit tests (mocked API) + stdio end-to-end test
OPENROUTER_MANAGEMENT_API_KEY=... npm test   # also runs live read-only calls
```
