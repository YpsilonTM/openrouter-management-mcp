# openrouter-management-mcp

MCP server (stdio) for the [OpenRouter Management API](https://openrouter.ai/docs/guides/overview/auth/management-api-keys): full coverage of routes that require a Management API key.

This is separate from the official OpenRouter MCP (model catalog, test messages), which cannot change account settings.

## Setup

1. Create a **Management API key** at [openrouter.ai/settings/management-keys](https://openrouter.ai/settings/management-keys). Set an expiration; a leaked management key can create and delete keys and change org settings. It cannot be used for completions.
2. Add it to the env file the MCP server loads (here `~/.config/ypsilon/mcp.env`):

   ```bash
   OPENROUTER_MANAGEMENT_API_KEY=sk-or-v1-...
   ```

3. Build:

   ```bash
   npm install
   npm run build
   ```

4. Register in `~/.cursor/mcp.json` (adjust paths for this machine):

   ```json
   "openrouter-management": {
     "command": "node",
     "args": ["C:/Users/yurih/Development/tools/openrouter-management-mcp/dist/index.js"],
     "envFile": "C:/Users/yurih/.config/ypsilon/mcp.env"
   }
   ```

The server starts without a key; tools then return a setup error instead of the server failing to load.

## Tools (by area)

Keys are identified by their `hash`, never by the `sk-or-...` secret. Destructive tools require `confirm: true`.

| Area | Tools |
|------|--------|
| **API keys** | `list` / `get` / `create` / `update` / `delete` |
| **Workspaces** | `list` / `get` / `create` / `update` / `delete`, members add/remove/list, budgets list/get/set/delete |
| **Guardrails** | CRUD, assign/unassign keys & members, list all assignments |
| **Guardrail policies** | Account policies; budget / moderation / model-availability policies; key & member policy assignments |
| **BYOK** | list / get / create / update / delete |
| **Organization** | list members, get/update settings |
| **Observability** | destinations CRUD |
| **External users** | list / get / create / update / delete |
| **Private** | providers + endpoints CRUD, validate / activate / enable / disable |
| **SCIM** | group mappings CRUD, list groups, start/get sync jobs |
| **Analytics** | meta + query |
| **Presets** | create from chat/completions, messages, or responses body |
| **Account** | credits, activity (30d) |
| **Generation** | submit feedback |

Tool names are prefixed with `openrouter_` (e.g. `openrouter_list_guardrails`, `openrouter_set_workspace_budget`).

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

Schemas follow the public [OpenAPI](https://openrouter.ai/openapi.json) / [Management API docs](https://openrouter.ai/docs/guides/overview/auth/management-api-keys). Complex `config` bodies (policies, observability, presets) are passed as JSON objects.
