"""BYOK provider credential tools."""

from __future__ import annotations

from typing import Annotated, Any
from urllib.parse import quote

from fastmcp import FastMCP

from openrouter_management_mcp.client import OpenRouterManagementClient, defined
from openrouter_management_mcp.tools.helpers import UNSET, body_updates, run_tool

_ID = "BYOK credential UUID."
_CONFIRM = "Must be true to confirm this destructive action."
_OFFSET = "Records to skip."
_PAGE = "Max records (1-100)."
_WS = "Workspace UUID (from openrouter_list_workspaces)."


def register_byok_tools(mcp: FastMCP, client: OpenRouterManagementClient) -> None:
    @mcp.tool(
        name="openrouter_list_byok",
        description=(
            "List bring-your-own-key provider credentials for a workspace "
            "(secrets are never returned)."
        ),
    )
    def openrouter_list_byok(
        offset: Annotated[int | None, _OFFSET] = None,
        limit: Annotated[int | None, _PAGE] = None,
        workspace_id: Annotated[str | None, _WS] = None,
        provider: Annotated[
            str | None, "Provider slug filter, e.g. openai, anthropic, amazon-bedrock."
        ] = None,
    ) -> Any:
        query = {
            "offset": offset,
            "limit": limit,
            "workspace_id": workspace_id,
            "provider": provider,
        }
        return run_tool(
            "openrouter_list_byok",
            query,
            lambda: client.request("GET", "/byok", query=query),
        )

    @mcp.tool(
        name="openrouter_get_byok",
        description="Get one BYOK credential by id (no plaintext provider key).",
    )
    def openrouter_get_byok(id: Annotated[str, _ID]) -> Any:
        return run_tool(
            "openrouter_get_byok",
            {"id": id},
            lambda: client.request("GET", f"/byok/{quote(id, safe='')}"),
        )

    @mcp.tool(
        name="openrouter_create_byok",
        description=(
            "Create a BYOK provider credential. The provider key is accepted once and never "
            "returned again."
        ),
    )
    def openrouter_create_byok(
        provider: Annotated[str, "Provider slug, e.g. openai."],
        key: Annotated[str, "Provider API key secret."],
        workspace_id: Annotated[str | None, _WS] = None,
        name: Annotated[str | None, "Display name."] = None,
        allowed_api_key_hashes: Annotated[list[str] | None, "Allowed key hashes."] = None,
        allowed_models: Annotated[list[str] | None, "Allowed models."] = None,
        allowed_user_ids: Annotated[list[str] | None, "Allowed user ids."] = None,
        declared_region: Annotated[str | None, "Declared region."] = None,
        declared_zdr: Annotated[bool | None, "Declared ZDR."] = None,
        disabled: Annotated[bool | None, "Disabled."] = None,
        is_byok_only: Annotated[bool | None, "BYOK only."] = None,
        is_fallback: Annotated[bool | None, "Fallback."] = None,
        is_required: Annotated[bool | None, "Required."] = None,
    ) -> Any:
        body = defined(
            {
                "provider": provider,
                "key": key,
                "workspace_id": workspace_id,
                "name": name,
                "allowed_api_key_hashes": allowed_api_key_hashes,
                "allowed_models": allowed_models,
                "allowed_user_ids": allowed_user_ids,
                "declared_region": declared_region,
                "declared_zdr": declared_zdr,
                "disabled": disabled,
                "is_byok_only": is_byok_only,
                "is_fallback": is_fallback,
                "is_required": is_required,
            }
        )
        return run_tool(
            "openrouter_create_byok",
            {"provider": provider, "name": name, "workspace_id": workspace_id},
            lambda: client.request("POST", "/byok", body=body),
        )

    @mcp.tool(
        name="openrouter_update_byok",
        description="Update a BYOK credential. Only passed fields change.",
    )
    def openrouter_update_byok(
        id: Annotated[str, _ID],
        name: Annotated[str | None, "Display name."] = UNSET,
        key: Annotated[str | None, "Rotate provider API key secret."] = UNSET,
        allowed_api_key_hashes: Annotated[list[str] | None, "Allowed key hashes."] = UNSET,
        allowed_models: Annotated[list[str] | None, "Allowed models."] = UNSET,
        allowed_user_ids: Annotated[list[str] | None, "Allowed user ids."] = UNSET,
        declared_region: Annotated[str | None, "Declared region."] = UNSET,
        declared_zdr: Annotated[bool | None, "Declared ZDR."] = UNSET,
        disabled: Annotated[bool | None, "Disabled."] = UNSET,
        is_byok_only: Annotated[bool | None, "BYOK only."] = UNSET,
        is_fallback: Annotated[bool | None, "Fallback."] = UNSET,
        is_required: Annotated[bool | None, "Required."] = UNSET,
    ) -> Any:
        def _run() -> Any:
            body = body_updates(
                {
                    "name": name,
                    "key": key,
                    "allowed_api_key_hashes": allowed_api_key_hashes,
                    "allowed_models": allowed_models,
                    "allowed_user_ids": allowed_user_ids,
                    "declared_region": declared_region,
                    "declared_zdr": declared_zdr,
                    "disabled": disabled,
                    "is_byok_only": is_byok_only,
                    "is_fallback": is_fallback,
                    "is_required": is_required,
                }
            )
            if not body:
                raise RuntimeError("Nothing to update. Pass at least one BYOK field.")
            return client.request("PATCH", f"/byok/{quote(id, safe='')}", body=body)

        return run_tool("openrouter_update_byok", {"id": id}, _run)

    @mcp.tool(
        name="openrouter_delete_byok",
        description="Permanently delete a BYOK provider credential.",
    )
    def openrouter_delete_byok(
        id: Annotated[str, _ID],
        confirm: Annotated[bool, _CONFIRM],
    ) -> Any:
        def _run() -> Any:
            if confirm is not True:
                raise RuntimeError("confirm must be true")
            return client.request("DELETE", f"/byok/{quote(id, safe='')}")

        return run_tool("openrouter_delete_byok", {"id": id}, _run)
