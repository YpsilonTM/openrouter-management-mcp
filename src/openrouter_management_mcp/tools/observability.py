"""Observability destination tools."""

from __future__ import annotations

from typing import Annotated, Any, Literal
from urllib.parse import quote

from fastmcp import FastMCP

from openrouter_management_mcp.client import OpenRouterManagementClient
from openrouter_management_mcp.tools.helpers import UNSET, body_updates, defined, run_tool

DataRegion = Literal["global", "europe", "us"]

_DEST_ID = "Observability destination UUID."
_REGIONS = (
    "Ingress regions: global=openrouter.ai, europe=eu.openrouter.ai, "
    "us=us.openrouter.ai. null = unrestricted."
)
_TYPE = "Destination type slug from OpenRouter."
_CONFIG = "Provider-specific config object."
_CONFIRM = "Must be true to confirm this destructive action."
_OFFSET = "Records to skip."
_PAGE = "Max records (1-100)."
_WORKSPACE = "Workspace UUID (from openrouter_list_workspaces)."


def register_observability_tools(mcp: FastMCP, client: OpenRouterManagementClient) -> None:
    @mcp.tool(
        name="openrouter_list_observability_destinations",
        description="List observability destinations for a workspace.",
    )
    def openrouter_list_observability_destinations(
        offset: Annotated[int | None, _OFFSET] = None,
        limit: Annotated[int | None, _PAGE] = None,
        workspace_id: Annotated[str | None, _WORKSPACE] = None,
    ) -> Any:
        query = {"offset": offset, "limit": limit, "workspace_id": workspace_id}

        def _run() -> Any:
            return client.request("GET", "/observability/destinations", query=query)

        return run_tool("openrouter_list_observability_destinations", query, _run)

    @mcp.tool(
        name="openrouter_get_observability_destination",
        description="Get one observability destination by id.",
    )
    def openrouter_get_observability_destination(id: Annotated[str, _DEST_ID]) -> Any:
        def _run() -> Any:
            return client.request("GET", f"/observability/destinations/{quote(id, safe='')}")

        return run_tool("openrouter_get_observability_destination", {"id": id}, _run)

    @mcp.tool(
        name="openrouter_create_observability_destination",
        description="Create an observability destination (type + name + config required).",
    )
    def openrouter_create_observability_destination(
        type: Annotated[str, _TYPE],
        name: Annotated[str, "Destination name."],
        config: Annotated[dict[str, Any], _CONFIG],
        workspace_id: Annotated[str | None, _WORKSPACE] = None,
        enabled: Annotated[bool | None, "Whether the destination is enabled."] = None,
        api_key_hashes: Annotated[
            list[str] | None, "API key hashes to include. Null clears."
        ] = None,
        broadcast_generation_cost: Annotated[
            bool | None, "Include generation cost in broadcast events."
        ] = None,
        broadcast_generation_cost_allocation: Annotated[
            bool | None, "Include cost allocation in broadcast events."
        ] = None,
        broadcast_generation_identity: Annotated[
            bool | None, "Include generation identity in broadcast events."
        ] = None,
        broadcast_generation_request_context: Annotated[
            bool | None, "Include request context in broadcast events."
        ] = None,
        filter_rules: Annotated[
            list[dict[str, Any]] | None, "Filter rules for this destination. Null clears."
        ] = None,
        privacy_mode: Annotated[str | None, "Privacy mode slug."] = None,
        regions: Annotated[list[DataRegion] | None, _REGIONS] = None,
        sampling_rate: Annotated[float | None, "Fraction of events to sample, from 0 to 1."] = None,
    ) -> Any:
        def _run() -> Any:
            return client.request(
                "POST",
                "/observability/destinations",
                body=defined(
                    {
                        "type": type,
                        "name": name,
                        "config": config,
                        "workspace_id": workspace_id,
                        "enabled": enabled,
                        "api_key_hashes": api_key_hashes,
                        "broadcast_generation_cost": broadcast_generation_cost,
                        "broadcast_generation_cost_allocation": (
                            broadcast_generation_cost_allocation
                        ),
                        "broadcast_generation_identity": broadcast_generation_identity,
                        "broadcast_generation_request_context": (
                            broadcast_generation_request_context
                        ),
                        "filter_rules": filter_rules,
                        "privacy_mode": privacy_mode,
                        "regions": regions,
                        "sampling_rate": sampling_rate,
                    }
                ),
            )

        return run_tool("openrouter_create_observability_destination", {"name": name}, _run)

    @mcp.tool(
        name="openrouter_update_observability_destination",
        description="Update an observability destination. Only passed fields change.",
    )
    def openrouter_update_observability_destination(
        id: Annotated[str, _DEST_ID],
        name: Annotated[str | None, "Destination name."] = UNSET,
        type: Annotated[str | None, _TYPE] = UNSET,
        config: Annotated[dict[str, Any] | None, _CONFIG] = UNSET,
        enabled: Annotated[bool | None, "Whether the destination is enabled."] = UNSET,
        api_key_hashes: Annotated[
            list[str] | None, "API key hashes to include. Null clears."
        ] = UNSET,
        broadcast_generation_cost: Annotated[
            bool | None, "Include generation cost in broadcast events."
        ] = UNSET,
        broadcast_generation_cost_allocation: Annotated[
            bool | None, "Include cost allocation in broadcast events."
        ] = UNSET,
        broadcast_generation_identity: Annotated[
            bool | None, "Include generation identity in broadcast events."
        ] = UNSET,
        broadcast_generation_request_context: Annotated[
            bool | None, "Include request context in broadcast events."
        ] = UNSET,
        filter_rules: Annotated[
            list[dict[str, Any]] | None, "Filter rules for this destination. Null clears."
        ] = UNSET,
        privacy_mode: Annotated[str | None, "Privacy mode slug."] = UNSET,
        regions: Annotated[list[DataRegion] | None, _REGIONS] = UNSET,
        sampling_rate: Annotated[
            float | None, "Fraction of events to sample, from 0 to 1."
        ] = UNSET,
    ) -> Any:
        def _run() -> Any:
            body = body_updates(
                {
                    "name": name,
                    "type": type,
                    "config": config,
                    "enabled": enabled,
                    "api_key_hashes": api_key_hashes,
                    "broadcast_generation_cost": broadcast_generation_cost,
                    "broadcast_generation_cost_allocation": broadcast_generation_cost_allocation,
                    "broadcast_generation_identity": broadcast_generation_identity,
                    "broadcast_generation_request_context": (broadcast_generation_request_context),
                    "filter_rules": filter_rules,
                    "privacy_mode": privacy_mode,
                    "regions": regions,
                    "sampling_rate": sampling_rate,
                }
            )
            if not body:
                raise RuntimeError("Nothing to update.")
            return client.request(
                "PATCH",
                f"/observability/destinations/{quote(id, safe='')}",
                body=body,
            )

        return run_tool("openrouter_update_observability_destination", {"id": id}, _run)

    @mcp.tool(
        name="openrouter_delete_observability_destination",
        description="Delete an observability destination.",
    )
    def openrouter_delete_observability_destination(
        id: Annotated[str, _DEST_ID],
        confirm: Annotated[bool, _CONFIRM],
    ) -> Any:
        def _run() -> Any:
            if confirm is not True:
                raise RuntimeError("confirm must be true")
            return client.request("DELETE", f"/observability/destinations/{quote(id, safe='')}")

        return run_tool("openrouter_delete_observability_destination", {"id": id}, _run)
