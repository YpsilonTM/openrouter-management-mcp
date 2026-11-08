"""API key management tools."""

from __future__ import annotations

from typing import Annotated, Any, Literal
from urllib.parse import quote

from fastmcp import FastMCP

from openrouter_management_mcp.client import OpenRouterManagementClient, defined
from openrouter_management_mcp.tools.helpers import UNSET, body_updates, run_tool

PAGE_SIZE = 100
MAX_PAGES = 50

LimitReset = Literal["daily", "weekly", "monthly", "none"]


def register_key_tools(mcp: FastMCP, client: OpenRouterManagementClient) -> None:
    @mcp.tool(
        name="openrouter_list_keys",
        description=(
            "List OpenRouter inference API keys with their limits and usage "
            "(daily/weekly/monthly). Returns hashes and labels only, never secrets. Keys are "
            "scoped per workspace; omit workspace_id for the default workspace. Use "
            "name_contains to find a key by name across all pages."
        ),
    )
    def openrouter_list_keys(
        name_contains: Annotated[
            str | None, "Case-insensitive filter on key name/label. Fetches all pages."
        ] = None,
        workspace_id: Annotated[
            str | None, "Workspace UUID (from openrouter_list_workspaces)."
        ] = None,
        include_disabled: Annotated[bool | None, "Include disabled keys."] = None,
        include_expired: Annotated[bool | None, "Include expired keys."] = None,
        offset: Annotated[
            int | None,
            f"Pagination offset (page size {PAGE_SIZE}). Ignored when name_contains is set.",
        ] = None,
    ) -> Any:
        def _run() -> Any:
            query = {
                "workspace_id": workspace_id,
                "include_disabled": include_disabled,
                "include_expired": include_expired,
            }
            if not name_contains:
                return client.request("GET", "/keys", query={**query, "offset": offset})

            needle = name_contains.lower()
            matches: list[dict[str, Any]] = []
            scanned = 0
            for page in range(MAX_PAGES):
                body = client.request("GET", "/keys", query={**query, "offset": page * PAGE_SIZE})
                data = body.get("data") if isinstance(body, dict) else None
                if not isinstance(data, list):
                    data = []
                scanned += len(data)
                for key in data:
                    if not isinstance(key, dict):
                        continue
                    haystack = f"{key.get('name') or ''} {key.get('label') or ''}".lower()
                    if needle in haystack:
                        matches.append(key)
                if len(data) < PAGE_SIZE:
                    break
            return {"data": matches, "scanned": scanned}

        return run_tool(
            "openrouter_list_keys",
            {
                "name_contains": name_contains,
                "workspace_id": workspace_id,
                "include_disabled": include_disabled,
                "include_expired": include_expired,
                "offset": offset,
            },
            _run,
        )

    @mcp.tool(
        name="openrouter_get_key",
        description=(
            "Get one OpenRouter API key by hash: limit, limit_remaining, limit_reset, usage, "
            "disabled, expires_at, workspace."
        ),
    )
    def openrouter_get_key(
        hash: Annotated[str, "Key hash (from openrouter_list_keys), not the sk-or-... secret."],
    ) -> Any:
        return run_tool(
            "openrouter_get_key",
            {"hash": hash},
            lambda: client.request("GET", f"/keys/{quote(hash, safe='')}"),
        )

    @mcp.tool(
        name="openrouter_create_key",
        description=(
            "Create a new OpenRouter inference API key, optionally with a USD spend limit, "
            "reset interval, and expiry. The plaintext `key` is returned ONLY in this "
            "response; tell the user to store it now."
        ),
    )
    def openrouter_create_key(
        name: Annotated[str, "Display name for the key."],
        limit: Annotated[float | None, "Spend limit in USD."] = None,
        limit_reset: Annotated[
            LimitReset | None,
            "When usage against limit resets (midnight UTC). none = never resets.",
        ] = None,
        include_byok_in_limit: Annotated[bool | None, "Count BYOK usage toward the limit."] = None,
        expires_at: Annotated[
            str | None,
            "Expiration ISO 8601 UTC with seconds, e.g. 2027-12-31T23:59:59Z.",
        ] = None,
        workspace_id: Annotated[
            str | None, "Workspace UUID. Defaults to the default workspace."
        ] = None,
        creator_user_id: Annotated[
            str | None, "Org only: create the key on behalf of this member user id."
        ] = None,
        external: Annotated[
            bool | None, "Mark the key as external (Connect / provisioned)."
        ] = None,
    ) -> Any:
        def _run() -> Any:
            reset = None if limit_reset in (None, "none") else limit_reset
            return client.request(
                "POST",
                "/keys",
                body=defined(
                    {
                        "name": name,
                        "limit": limit,
                        "limit_reset": reset,
                        "include_byok_in_limit": include_byok_in_limit,
                        "expires_at": expires_at,
                        "workspace_id": workspace_id,
                        "creator_user_id": creator_user_id,
                        "external": external,
                    }
                ),
            )

        return run_tool(
            "openrouter_create_key",
            {"name": name, "limit": limit, "limit_reset": limit_reset},
            _run,
        )

    @mcp.tool(
        name="openrouter_update_key",
        description=(
            "Update an OpenRouter API key by hash. Use this to set or remove a spend limit "
            "(limit + limit_reset), rename, disable/enable, or move it to another workspace. "
            "Only the fields you pass are changed. Expiry cannot be changed after creation."
        ),
    )
    def openrouter_update_key(
        hash: Annotated[str, "Key hash from openrouter_list_keys."],
        name: Annotated[str | None, "New display name."] = UNSET,
        disabled: Annotated[bool | None, "true disables the key, false re-enables it."] = UNSET,
        limit: Annotated[
            float | None, "New spend limit in USD. Pass null to remove the limit."
        ] = UNSET,
        limit_reset: Annotated[LimitReset | None, "Reset interval; none clears the reset."] = UNSET,
        include_byok_in_limit: Annotated[bool | None, "Count BYOK toward the limit."] = UNSET,
        workspace_id: Annotated[
            str | None,
            "Move the key to this workspace. Guardrails move with it; presets/BYOK/routing do not.",
        ] = UNSET,
    ) -> Any:
        def _run() -> Any:
            body = body_updates(
                {
                    "name": name,
                    "disabled": disabled,
                    "limit": limit,
                    "include_byok_in_limit": include_byok_in_limit,
                    "workspace_id": workspace_id,
                }
            )
            if limit_reset is not UNSET:
                body["limit_reset"] = None if limit_reset == "none" else limit_reset
            if not body:
                raise RuntimeError(
                    "Nothing to update. Pass at least one of: name, disabled, limit, "
                    "limit_reset, include_byok_in_limit, workspace_id."
                )
            return client.request("PATCH", f"/keys/{quote(hash, safe='')}", body=body)

        return run_tool("openrouter_update_key", {"hash": hash}, _run)

    @mcp.tool(
        name="openrouter_delete_key",
        description=(
            "Permanently delete an OpenRouter API key by hash. Irreversible. Prefer "
            "openrouter_update_key with disabled=true unless the user explicitly wants deletion."
        ),
    )
    def openrouter_delete_key(
        hash: Annotated[str, "Key hash from openrouter_list_keys."],
        confirm: Annotated[bool, "Must be true to confirm permanent deletion."],
    ) -> Any:
        def _run() -> Any:
            if confirm is not True:
                raise RuntimeError("confirm must be true")
            return client.request("DELETE", f"/keys/{quote(hash, safe='')}")

        return run_tool("openrouter_delete_key", {"hash": hash}, _run)
