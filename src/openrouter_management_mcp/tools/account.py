"""Credits and activity tools."""

from __future__ import annotations

from typing import Annotated, Any

from fastmcp import FastMCP

from openrouter_management_mcp.client import OpenRouterManagementClient
from openrouter_management_mcp.tools.helpers import run_tool


def register_account_tools(mcp: FastMCP, client: OpenRouterManagementClient) -> None:
    @mcp.tool(
        name="openrouter_get_credits",
        description=(
            "Get OpenRouter account credits: total purchased, total used, and remaining "
            "balance (USD)."
        ),
    )
    def openrouter_get_credits() -> Any:
        def _run() -> Any:
            body = client.request("GET", "/credits")
            data = body.get("data") if isinstance(body, dict) else None
            if not isinstance(data, dict):
                return body
            total_credits = data.get("total_credits")
            total_usage = data.get("total_usage")
            if not isinstance(total_credits, (int, float)) or not isinstance(
                total_usage, (int, float)
            ):
                return body
            remaining = round((total_credits - total_usage) * 1e6) / 1e6
            return {
                "total_credits": total_credits,
                "total_usage": total_usage,
                "remaining": remaining,
            }

        return run_tool("openrouter_get_credits", {}, _run)

    @mcp.tool(
        name="openrouter_get_activity",
        description=(
            "Get spend/usage activity for the last 30 days, grouped by date, model, and "
            "endpoint. Filter by a single date or a specific key hash to see what a key spent on."
        ),
    )
    def openrouter_get_activity(
        date: Annotated[str | None, "Single UTC date within the last 30 days (YYYY-MM-DD)."] = None,
        api_key_hash: Annotated[str | None, "Only activity for this key hash."] = None,
        workspace_id: Annotated[str | None, "Only activity for this workspace."] = None,
        group_by_workspace: Annotated[
            bool | None, "Split rows per workspace and include workspace_id on each."
        ] = None,
    ) -> Any:
        def _run() -> Any:
            return client.request(
                "GET",
                "/activity",
                query={
                    "date": date,
                    "api_key_hash": api_key_hash,
                    "workspace_id": workspace_id,
                    "group_by": "workspace" if group_by_workspace else None,
                },
            )

        return run_tool(
            "openrouter_get_activity",
            {
                "date": date,
                "api_key_hash": api_key_hash,
                "workspace_id": workspace_id,
                "group_by_workspace": group_by_workspace,
            },
            _run,
        )
