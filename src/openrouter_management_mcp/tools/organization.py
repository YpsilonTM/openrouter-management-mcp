"""Organization members and settings tools."""

from __future__ import annotations

from typing import Annotated, Any

from fastmcp import FastMCP

from openrouter_management_mcp.client import OpenRouterManagementClient
from openrouter_management_mcp.tools.helpers import run_tool


def register_organization_tools(mcp: FastMCP, client: OpenRouterManagementClient) -> None:
    @mcp.tool(
        name="openrouter_list_organization_members",
        description=(
            "List organization members (id/user_id and role). Org-only; personal accounts get 404."
        ),
    )
    def openrouter_list_organization_members(
        offset: Annotated[int | None, "Records to skip."] = None,
        limit: Annotated[int | None, "Max records (1-100)."] = None,
    ) -> Any:
        query = {"offset": offset, "limit": limit}
        return run_tool(
            "openrouter_list_organization_members",
            query,
            lambda: client.request("GET", "/organization/members", query=query),
        )

    @mcp.tool(
        name="openrouter_get_organization_settings",
        description=(
            "Read org settings (e.g. filtered model catalog). Org management keys only; "
            "personal accounts get 404."
        ),
    )
    def openrouter_get_organization_settings() -> Any:
        return run_tool(
            "openrouter_get_organization_settings",
            {},
            lambda: client.request("GET", "/organization/settings"),
        )

    @mcp.tool(
        name="openrouter_update_organization_settings",
        description=(
            "Update org settings. Currently: is_filtered_model_catalog_enabled "
            "(Settings → Privacy → filter model catalog for API keys)."
        ),
    )
    def openrouter_update_organization_settings(
        is_filtered_model_catalog_enabled: Annotated[
            bool,
            "When true, org API keys only see models allowed by workspace guardrails/preferences.",
        ],
    ) -> Any:
        body = {"is_filtered_model_catalog_enabled": is_filtered_model_catalog_enabled}
        return run_tool(
            "openrouter_update_organization_settings",
            body,
            lambda: client.request("PATCH", "/organization/settings", body=body),
        )
