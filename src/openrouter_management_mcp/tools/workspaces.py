"""Workspace, member, and budget tools."""

from __future__ import annotations

from typing import Annotated, Any, Literal
from urllib.parse import quote

from fastmcp import FastMCP

from openrouter_management_mcp.client import OpenRouterManagementClient, defined
from openrouter_management_mcp.tools.helpers import UNSET, body_updates, run_tool

BudgetInterval = Literal["daily", "weekly", "monthly", "lifetime"]
ProviderSort = Literal["price", "throughput", "latency"]

_WS = "Workspace UUID or slug (from openrouter_list_workspaces)."
_CONFIRM = "Must be true to confirm this destructive action."
_OFFSET = "Records to skip."
_PAGE = "Max records (1-100)."


def register_workspace_tools(mcp: FastMCP, client: OpenRouterManagementClient) -> None:
    @mcp.tool(
        name="openrouter_list_workspaces",
        description=(
            "List OpenRouter workspaces (id, slug, name, default guardrail, routing defaults). "
            "Keys, budgets, BYOK, and guardrails are workspace-scoped."
        ),
    )
    def openrouter_list_workspaces(
        offset: Annotated[int | None, _OFFSET] = None,
        limit: Annotated[int | None, _PAGE] = None,
    ) -> Any:
        query = {"offset": offset, "limit": limit}
        return run_tool(
            "openrouter_list_workspaces",
            query,
            lambda: client.request("GET", "/workspaces", query=query),
        )

    @mcp.tool(name="openrouter_get_workspace", description="Get one workspace by UUID or slug.")
    def openrouter_get_workspace(workspace: Annotated[str, _WS]) -> Any:
        return run_tool(
            "openrouter_get_workspace",
            {"workspace": workspace},
            lambda: client.request("GET", f"/workspaces/{quote(workspace, safe='')}"),
        )

    @mcp.tool(
        name="openrouter_create_workspace",
        description=(
            "Create a workspace. Requires name and slug. Optional defaults for models, "
            "provider sort, and observability."
        ),
    )
    def openrouter_create_workspace(
        name: Annotated[str, "Display name."],
        slug: Annotated[str, "URL slug (lowercase kebab-case)."],
        default_text_model: Annotated[str | None, "Default text model."] = None,
        default_image_model: Annotated[str | None, "Default image model."] = None,
        default_provider_sort: Annotated[
            ProviderSort | None, "Default provider sort for the workspace."
        ] = None,
        disabled_server_tools: Annotated[list[str] | None, "Disabled server tools."] = None,
        io_logging_api_key_ids: Annotated[list[str] | None, "IO logging API key ids."] = None,
        io_logging_sampling_rate: Annotated[float | None, "IO logging sampling rate 0-1."] = None,
        is_data_discount_logging_enabled: Annotated[bool | None, "Data discount logging."] = None,
        is_observability_broadcast_enabled: Annotated[
            bool | None, "Observability broadcast."
        ] = None,
        is_observability_io_logging_enabled: Annotated[
            bool | None, "Observability IO logging."
        ] = None,
    ) -> Any:
        body = defined(
            {
                "name": name,
                "slug": slug,
                "default_text_model": default_text_model,
                "default_image_model": default_image_model,
                "default_provider_sort": default_provider_sort,
                "disabled_server_tools": disabled_server_tools,
                "io_logging_api_key_ids": io_logging_api_key_ids,
                "io_logging_sampling_rate": io_logging_sampling_rate,
                "is_data_discount_logging_enabled": is_data_discount_logging_enabled,
                "is_observability_broadcast_enabled": is_observability_broadcast_enabled,
                "is_observability_io_logging_enabled": is_observability_io_logging_enabled,
            }
        )
        return run_tool(
            "openrouter_create_workspace",
            {"name": name, "slug": slug},
            lambda: client.request("POST", "/workspaces", body=body),
        )

    @mcp.tool(
        name="openrouter_update_workspace",
        description=(
            "Update workspace settings (name, slug, default models/sort, observability). "
            "Only passed fields change."
        ),
    )
    def openrouter_update_workspace(
        workspace: Annotated[str, _WS],
        name: Annotated[str | None, "Display name."] = UNSET,
        slug: Annotated[str | None, "URL slug."] = UNSET,
        default_text_model: Annotated[str | None, "Default text model."] = UNSET,
        default_image_model: Annotated[str | None, "Default image model."] = UNSET,
        default_provider_sort: Annotated[ProviderSort | None, "Provider sort."] = UNSET,
        disabled_server_tools: Annotated[list[str] | None, "Disabled server tools."] = UNSET,
        io_logging_api_key_ids: Annotated[list[str] | None, "IO logging key ids."] = UNSET,
        io_logging_sampling_rate: Annotated[float | None, "Sampling rate."] = UNSET,
        is_data_discount_logging_enabled: Annotated[bool | None, "Data discount logging."] = UNSET,
        is_observability_broadcast_enabled: Annotated[bool | None, "Broadcast."] = UNSET,
        is_observability_io_logging_enabled: Annotated[bool | None, "IO logging."] = UNSET,
    ) -> Any:
        def _run() -> Any:
            body = body_updates(
                {
                    "name": name,
                    "slug": slug,
                    "default_text_model": default_text_model,
                    "default_image_model": default_image_model,
                    "default_provider_sort": default_provider_sort,
                    "disabled_server_tools": disabled_server_tools,
                    "io_logging_api_key_ids": io_logging_api_key_ids,
                    "io_logging_sampling_rate": io_logging_sampling_rate,
                    "is_data_discount_logging_enabled": is_data_discount_logging_enabled,
                    "is_observability_broadcast_enabled": is_observability_broadcast_enabled,
                    "is_observability_io_logging_enabled": is_observability_io_logging_enabled,
                }
            )
            if not body:
                raise RuntimeError("Nothing to update. Pass at least one workspace field.")
            return client.request("PATCH", f"/workspaces/{quote(workspace, safe='')}", body=body)

        return run_tool("openrouter_update_workspace", {"workspace": workspace}, _run)

    @mcp.tool(
        name="openrouter_delete_workspace",
        description=(
            "Permanently delete a workspace. Irreversible. For the default workspace, also "
            "pass confirm_default_workspace_deletion=true."
        ),
    )
    def openrouter_delete_workspace(
        workspace: Annotated[str, _WS],
        confirm: Annotated[bool, _CONFIRM],
        confirm_default_workspace_deletion: Annotated[
            bool | None, "Required when deleting the account default workspace."
        ] = None,
    ) -> Any:
        def _run() -> Any:
            if confirm is not True:
                raise RuntimeError("confirm must be true")
            return client.request(
                "DELETE",
                f"/workspaces/{quote(workspace, safe='')}",
                query={"confirm_default_workspace_deletion": confirm_default_workspace_deletion},
            )

        return run_tool("openrouter_delete_workspace", {"workspace": workspace}, _run)

    @mcp.tool(
        name="openrouter_list_workspace_members",
        description="List members of a workspace (user_id, role).",
    )
    def openrouter_list_workspace_members(
        workspace: Annotated[str, _WS],
        offset: Annotated[int | None, _OFFSET] = None,
        limit: Annotated[int | None, _PAGE] = None,
    ) -> Any:
        query = {"offset": offset, "limit": limit}
        return run_tool(
            "openrouter_list_workspace_members",
            {"workspace": workspace, **query},
            lambda: client.request(
                "GET", f"/workspaces/{quote(workspace, safe='')}/members", query=query
            ),
        )

    @mcp.tool(
        name="openrouter_add_workspace_members",
        description=(
            "Bulk-add organization members to a workspace. They inherit their org role "
            "(Org Admin→Workspace Admin, Org Member→Workspace Member)."
        ),
    )
    def openrouter_add_workspace_members(
        workspace: Annotated[str, _WS],
        user_ids: Annotated[
            list[str],
            "Organization member user IDs (from openrouter_list_organization_members).",
        ],
    ) -> Any:
        return run_tool(
            "openrouter_add_workspace_members",
            {"workspace": workspace, "count": len(user_ids)},
            lambda: client.request(
                "POST",
                f"/workspaces/{quote(workspace, safe='')}/members/add",
                body={"user_ids": user_ids},
            ),
        )

    @mcp.tool(
        name="openrouter_remove_workspace_members",
        description="Bulk-remove members from a workspace.",
    )
    def openrouter_remove_workspace_members(
        workspace: Annotated[str, _WS],
        user_ids: Annotated[list[str], "User IDs to remove."],
        confirm: Annotated[bool, _CONFIRM],
    ) -> Any:
        def _run() -> Any:
            if confirm is not True:
                raise RuntimeError("confirm must be true")
            return client.request(
                "POST",
                f"/workspaces/{quote(workspace, safe='')}/members/remove",
                body={"user_ids": user_ids},
            )

        return run_tool(
            "openrouter_remove_workspace_members",
            {"workspace": workspace, "count": len(user_ids)},
            _run,
        )

    @mcp.tool(
        name="openrouter_list_workspace_budgets",
        description=(
            "List spend budgets (daily/weekly/monthly/lifetime) for a workspace. Caps total "
            "spend across all keys, unlike per-key limits."
        ),
    )
    def openrouter_list_workspace_budgets(workspace: Annotated[str, _WS]) -> Any:
        return run_tool(
            "openrouter_list_workspace_budgets",
            {"workspace": workspace},
            lambda: client.request("GET", f"/workspaces/{quote(workspace, safe='')}/budgets"),
        )

    @mcp.tool(
        name="openrouter_get_workspace_budget",
        description="Get the budget for one interval on a workspace.",
    )
    def openrouter_get_workspace_budget(
        workspace: Annotated[str, _WS],
        interval: Annotated[BudgetInterval, "Budget interval. lifetime never resets."],
    ) -> Any:
        return run_tool(
            "openrouter_get_workspace_budget",
            {"workspace": workspace, "interval": interval},
            lambda: client.request(
                "GET",
                f"/workspaces/{quote(workspace, safe='')}/budgets/{interval}",
            ),
        )

    @mcp.tool(
        name="openrouter_set_workspace_budget",
        description=(
            "Create or update a workspace spend budget for one interval. Caps total spend of "
            "all keys in the workspace."
        ),
    )
    def openrouter_set_workspace_budget(
        workspace: Annotated[str, _WS],
        interval: Annotated[BudgetInterval, "Budget interval. lifetime never resets."],
        limit_usd: Annotated[float, "Budget in USD (> 0)."],
        include_byok_in_budgets: Annotated[
            bool | None,
            "Count BYOK spend toward budgets. Workspace-wide. Omit to leave unchanged.",
        ] = None,
    ) -> Any:
        body = defined({"limit_usd": limit_usd, "include_byok_in_budgets": include_byok_in_budgets})
        return run_tool(
            "openrouter_set_workspace_budget",
            {"workspace": workspace, "interval": interval, "limit_usd": limit_usd},
            lambda: client.request(
                "PUT",
                f"/workspaces/{quote(workspace, safe='')}/budgets/{interval}",
                body=body,
            ),
        )

    @mcp.tool(
        name="openrouter_delete_workspace_budget",
        description=(
            "Remove a workspace spend budget for one interval, leaving that interval uncapped."
        ),
    )
    def openrouter_delete_workspace_budget(
        workspace: Annotated[str, _WS],
        interval: Annotated[BudgetInterval, "Budget interval."],
        confirm: Annotated[bool, _CONFIRM],
    ) -> Any:
        def _run() -> Any:
            if confirm is not True:
                raise RuntimeError("confirm must be true")
            return client.request(
                "DELETE",
                f"/workspaces/{quote(workspace, safe='')}/budgets/{interval}",
            )

        return run_tool(
            "openrouter_delete_workspace_budget",
            {"workspace": workspace, "interval": interval},
            _run,
        )
