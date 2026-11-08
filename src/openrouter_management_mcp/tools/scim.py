"""SCIM group mapping and directory sync tools."""

from __future__ import annotations

from typing import Annotated, Any, Literal
from urllib.parse import quote

from fastmcp import FastMCP

from openrouter_management_mcp.client import OpenRouterManagementClient
from openrouter_management_mcp.tools.helpers import run_tool

ScimRole = Literal["admin", "member"]

_MAPPING_ID = "SCIM group mapping UUID."
_ROLE = "Workspace role granted by the mapping."
_WORKSPACE = "Workspace UUID (from openrouter_list_workspaces)."
_CONFIRM = "Must be true to confirm this destructive action."
_OFFSET = "Records to skip."
_PAGE = "Max records (1-100)."


def register_scim_tools(mcp: FastMCP, client: OpenRouterManagementClient) -> None:
    @mcp.tool(
        name="openrouter_list_scim_group_mappings",
        description="List SCIM directory group → workspace role mappings.",
    )
    def openrouter_list_scim_group_mappings(
        offset: Annotated[int | None, _OFFSET] = None,
        limit: Annotated[int | None, _PAGE] = None,
    ) -> Any:
        query = {"offset": offset, "limit": limit}

        def _run() -> Any:
            return client.request("GET", "/scim/group-mappings", query=query)

        return run_tool("openrouter_list_scim_group_mappings", query, _run)

    @mcp.tool(
        name="openrouter_get_scim_group_mapping",
        description="Get one SCIM group mapping by id.",
    )
    def openrouter_get_scim_group_mapping(id: Annotated[str, _MAPPING_ID]) -> Any:
        def _run() -> Any:
            return client.request("GET", f"/scim/group-mappings/{quote(id, safe='')}")

        return run_tool("openrouter_get_scim_group_mapping", {"id": id}, _run)

    @mcp.tool(
        name="openrouter_create_scim_group_mapping",
        description="Map a SCIM group to a workspace role.",
    )
    def openrouter_create_scim_group_mapping(
        scim_group_id: Annotated[str, "SCIM directory group id."],
        workspace_id: Annotated[str, _WORKSPACE],
        role: Annotated[ScimRole, _ROLE],
    ) -> Any:
        body = {
            "scim_group_id": scim_group_id,
            "workspace_id": workspace_id,
            "role": role,
        }

        def _run() -> Any:
            return client.request("POST", "/scim/group-mappings", body=body)

        return run_tool("openrouter_create_scim_group_mapping", body, _run)

    @mcp.tool(
        name="openrouter_update_scim_group_mapping",
        description="Change the workspace role for a SCIM group mapping.",
    )
    def openrouter_update_scim_group_mapping(
        id: Annotated[str, _MAPPING_ID],
        role: Annotated[ScimRole, _ROLE],
    ) -> Any:
        def _run() -> Any:
            return client.request(
                "PATCH",
                f"/scim/group-mappings/{quote(id, safe='')}",
                body={"role": role},
            )

        return run_tool("openrouter_update_scim_group_mapping", {"id": id, "role": role}, _run)

    @mcp.tool(
        name="openrouter_delete_scim_group_mapping",
        description=(
            "Delete a SCIM group mapping. keep_members=true leaves existing workspace "
            "memberships in place."
        ),
    )
    def openrouter_delete_scim_group_mapping(
        id: Annotated[str, _MAPPING_ID],
        keep_members: Annotated[
            bool,
            "When true, leave existing workspace memberships in place.",
        ],
        confirm: Annotated[bool, _CONFIRM],
    ) -> Any:
        def _run() -> Any:
            if confirm is not True:
                raise RuntimeError("confirm must be true")
            return client.request(
                "DELETE",
                f"/scim/group-mappings/{quote(id, safe='')}",
                query={"keep_members": keep_members},
            )

        return run_tool(
            "openrouter_delete_scim_group_mapping",
            {"id": id, "keep_members": keep_members},
            _run,
        )

    @mcp.tool(
        name="openrouter_list_scim_groups",
        description="List groups from the connected SCIM directory.",
    )
    def openrouter_list_scim_groups(
        offset: Annotated[int | None, _OFFSET] = None,
        limit: Annotated[int | None, _PAGE] = None,
        display_name: Annotated[str | None, "Filter by group display name."] = None,
        external_id: Annotated[str | None, "Filter by group external id."] = None,
    ) -> Any:
        query = {
            "offset": offset,
            "limit": limit,
            "display_name": display_name,
            "external_id": external_id,
        }

        def _run() -> Any:
            return client.request("GET", "/scim/groups", query=query)

        return run_tool("openrouter_list_scim_groups", query, _run)

    @mcp.tool(
        name="openrouter_start_scim_sync",
        description="Start a SCIM directory sync job.",
    )
    def openrouter_start_scim_sync() -> Any:
        def _run() -> Any:
            return client.request("POST", "/scim/sync-jobs")

        return run_tool("openrouter_start_scim_sync", {}, _run)

    @mcp.tool(
        name="openrouter_get_scim_sync_job",
        description="Get status of a SCIM directory sync job.",
    )
    def openrouter_get_scim_sync_job(id: Annotated[str, "Sync job UUID."]) -> Any:
        def _run() -> Any:
            return client.request("GET", f"/scim/sync-jobs/{quote(id, safe='')}")

        return run_tool("openrouter_get_scim_sync_job", {"id": id}, _run)
