"""FastMCP server assembly."""

from __future__ import annotations

import os

from fastmcp import FastMCP

from openrouter_management_mcp import __version__
from openrouter_management_mcp.client import (
    OpenRouterManagementClient,
    create_client_from_env,
)
from openrouter_management_mcp.log import get_log_level, log
from openrouter_management_mcp.tools.account import register_account_tools
from openrouter_management_mcp.tools.analytics import register_analytics_tools
from openrouter_management_mcp.tools.byok import register_byok_tools
from openrouter_management_mcp.tools.external_users import register_external_user_tools
from openrouter_management_mcp.tools.generation import register_generation_tools
from openrouter_management_mcp.tools.guardrail_policies import register_guardrail_policy_tools
from openrouter_management_mcp.tools.guardrails import register_guardrail_tools
from openrouter_management_mcp.tools.keys import register_key_tools
from openrouter_management_mcp.tools.observability import register_observability_tools
from openrouter_management_mcp.tools.organization import register_organization_tools
from openrouter_management_mcp.tools.presets import register_preset_tools
from openrouter_management_mcp.tools.private import register_private_tools
from openrouter_management_mcp.tools.scim import register_scim_tools
from openrouter_management_mcp.tools.workspaces import register_workspace_tools


def create_mcp_server(client: OpenRouterManagementClient | None = None) -> FastMCP:
    """Build the FastMCP server with all OpenRouter Management API tools."""
    if client is None:
        client = create_client_from_env()

    mcp = FastMCP(
        name="openrouter-management-mcp",
        version=__version__,
        instructions=(
            "Manages an OpenRouter account via the Management API "
            "(requires OPENROUTER_MANAGEMENT_API_KEY). Covers: API keys, workspaces "
            "(+ members/budgets), guardrails (+ assignments), guardrail policies, BYOK, "
            "org members/settings, observability destinations, external users, private "
            "providers/endpoints, SCIM, analytics, presets, credits/activity, generation "
            "feedback. Keys are identified by `hash`, never the sk-or-... secret. Prefer "
            "disabling keys over deleting. Destructive tools require confirm=true."
        ),
    )

    register_key_tools(mcp, client)
    register_workspace_tools(mcp, client)
    register_account_tools(mcp, client)
    register_guardrail_tools(mcp, client)
    register_guardrail_policy_tools(mcp, client)
    register_byok_tools(mcp, client)
    register_organization_tools(mcp, client)
    register_observability_tools(mcp, client)
    register_external_user_tools(mcp, client)
    register_private_tools(mcp, client)
    register_scim_tools(mcp, client)
    register_analytics_tools(mcp, client)
    register_preset_tools(mcp, client)
    register_generation_tools(mcp, client)

    return mcp


def start_mcp_server() -> None:
    log.info(
        "Starting OpenRouter Management MCP",
        {
            "version": __version__,
            "logLevel": get_log_level(),
            "managementKeyConfigured": bool(os.environ.get("OPENROUTER_MANAGEMENT_API_KEY")),
        },
    )
    if not os.environ.get("OPENROUTER_MANAGEMENT_API_KEY"):
        log.warn(
            "OPENROUTER_MANAGEMENT_API_KEY is not set; tools will return an error until "
            "it is configured"
        )
    mcp = create_mcp_server()
    log.info("MCP server connected on stdio")
    mcp.run(transport="stdio")
