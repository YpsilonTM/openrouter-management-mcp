"""External user tools."""

from __future__ import annotations

from typing import Annotated, Any
from urllib.parse import quote

from fastmcp import FastMCP

from openrouter_management_mcp.client import OpenRouterManagementClient
from openrouter_management_mcp.tools.helpers import run_tool

_USER = "External user identifier."
_CONFIRM = "Must be true to confirm this destructive action."
_OFFSET = "Records to skip."
_PAGE = "Max records (1-100)."


def register_external_user_tools(mcp: FastMCP, client: OpenRouterManagementClient) -> None:
    @mcp.tool(
        name="openrouter_list_external_users",
        description="List registered external users (Connect / provisioned customers).",
    )
    def openrouter_list_external_users(
        offset: Annotated[int | None, _OFFSET] = None,
        limit: Annotated[int | None, _PAGE] = None,
        user: Annotated[str | None, "Filter by exact user id."] = None,
        include_inactive: Annotated[bool | None, "Include inactive users."] = None,
    ) -> Any:
        query = {
            "offset": offset,
            "limit": limit,
            "user": user,
            "include_inactive": include_inactive,
        }

        def _run() -> Any:
            return client.request("GET", "/external-users", query=query)

        return run_tool("openrouter_list_external_users", query, _run)

    @mcp.tool(
        name="openrouter_get_external_user",
        description="Get one registered external user.",
    )
    def openrouter_get_external_user(user: Annotated[str, _USER]) -> Any:
        def _run() -> Any:
            return client.request("GET", f"/external-users/{quote(user, safe='')}")

        return run_tool("openrouter_get_external_user", {"user": user}, _run)

    @mcp.tool(
        name="openrouter_create_external_user",
        description="Register an external user id.",
    )
    def openrouter_create_external_user(user: Annotated[str, _USER]) -> Any:
        def _run() -> Any:
            return client.request("POST", "/external-users", body={"user": user})

        return run_tool("openrouter_create_external_user", {"user": user}, _run)

    @mcp.tool(
        name="openrouter_update_external_user",
        description="Set is_active on a registered external user.",
    )
    def openrouter_update_external_user(
        user: Annotated[str, _USER],
        is_active: Annotated[bool, "Whether the external user is active."],
    ) -> Any:
        def _run() -> Any:
            return client.request(
                "PATCH",
                f"/external-users/{quote(user, safe='')}",
                body={"is_active": is_active},
            )

        return run_tool(
            "openrouter_update_external_user",
            {"user": user, "is_active": is_active},
            _run,
        )

    @mcp.tool(
        name="openrouter_delete_external_user",
        description="Deactivate (delete) a registered external user.",
    )
    def openrouter_delete_external_user(
        user: Annotated[str, _USER],
        confirm: Annotated[bool, _CONFIRM],
    ) -> Any:
        def _run() -> Any:
            if confirm is not True:
                raise RuntimeError("confirm must be true")
            return client.request("DELETE", f"/external-users/{quote(user, safe='')}")

        return run_tool("openrouter_delete_external_user", {"user": user}, _run)
