# openrouter-management-mcp

MCP server (stdio) for the [OpenRouter Management API](https://openrouter.ai/docs/guides/overview/auth/management-api-keys): full coverage of routes that require a Management API key.

Python / [UV](https://docs.astral.sh/uv/) / [FastMCP](https://gofastmcp.com/) — same pattern as [withings-mcp](https://github.com/YpsilonTM/withings-mcp). Separate from the official OpenRouter MCP (model catalog, test messages).

## Setup

1. Create a **Management API key** at [openrouter.ai/settings/management-keys](https://openrouter.ai/settings/management-keys). Set an expiration.
2. Export it (or put it in `.env`):

   ```bash
   OPENROUTER_MANAGEMENT_API_KEY=sk-or-v1-...
   ```

3. Run:

   ```bash
   uv sync
   uv run openrouter-management-mcp
   ```

Or without a checkout:

```bash
uvx --from git+https://github.com/YpsilonTM/openrouter-management-mcp openrouter-management-mcp
```

## MCPHub / Cursor

Register via **uvx** (no Docker image). See [examples/mcp_settings.json](examples/mcp_settings.json).

On the homeserver MCPHub (`~/data/mcphub/mcp_settings.json`):

```json
"openrouter-management": {
  "type": "stdio",
  "command": "uvx",
  "args": [
    "--from",
    "git+https://github.com/YpsilonTM/openrouter-management-mcp",
    "openrouter-management-mcp"
  ],
  "env": {
    "OPENROUTER_MANAGEMENT_API_KEY": "",
    "OPENROUTER_MGMT_LOG_LEVEL": "info"
  }
}
```

Bind the management key via MCPHub per-user credentials (and mirror the env name in `~/docker/ai/.env` / the `mcphub` service). Cursor talks to the hub proxy, e.g. `http://192.168.50.14:8811/mcp/openrouter-management`.

## Tools (by area)

101 tools, prefixed `openrouter_*`. Keys are identified by `hash`, never the `sk-or-...` secret. Destructive tools require `confirm: true`.

| Area | Coverage |
|------|----------|
| **API keys** | list / get / create / update / delete |
| **Workspaces** | CRUD, members, budgets |
| **Guardrails** | CRUD, key/member assignments |
| **Guardrail policies** | account + budget/moderation/model-availability + assignments |
| **BYOK** | list / get / create / update / delete |
| **Organization** | members, settings |
| **Observability** | destinations CRUD |
| **External users** | CRUD |
| **Private** | providers + endpoints (+ validate/activate/enable/disable) |
| **SCIM** | group mappings, groups, sync jobs |
| **Analytics** | meta + query |
| **Presets** | create from chat/completions, messages, or responses body |
| **Account** | credits, activity |
| **Generation** | submit feedback |

## Environment

| Variable | Default | |
|----------|---------|---|
| `OPENROUTER_MANAGEMENT_API_KEY` | — | Required for tool calls |
| `OPENROUTER_MGMT_LOG_LEVEL` | `info` | `error`/`warn`/`info`/`debug` (stderr JSON) |
| `OPENROUTER_BASE_URL` | `https://openrouter.ai/api/v1` | |

## Development

```bash
uv sync --all-extras
uv run ruff check src tests
uv run pytest
```

Schemas follow the public [OpenAPI](https://openrouter.ai/openapi.json) / [Management API docs](https://openrouter.ai/docs/guides/overview/auth/management-api-keys).
