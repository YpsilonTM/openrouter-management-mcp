"""Preset create tools (chat/completions, messages, responses)."""

from __future__ import annotations

from typing import Annotated, Any
from urllib.parse import quote

from fastmcp import FastMCP

from openrouter_management_mcp.client import OpenRouterManagementClient
from openrouter_management_mcp.tools.helpers import run_tool

_SLUG = "Preset slug to create or overwrite."
_WS = "Workspace UUID (from openrouter_list_workspaces)."
_BODY = (
    "Full request body matching the OpenRouter request shape "
    "(model, messages/input, parameters, etc.)."
)


def register_preset_tools(mcp: FastMCP, client: OpenRouterManagementClient) -> None:
    @mcp.tool(
        name="openrouter_create_preset_chat_completions",
        description=(
            "Create or overwrite a preset from a chat-completions-shaped request body. "
            "Management key required."
        ),
    )
    def openrouter_create_preset_chat_completions(
        slug: Annotated[str, _SLUG],
        body: Annotated[dict[str, Any], _BODY],
        workspace_id: Annotated[str | None, _WS] = None,
    ) -> Any:
        return run_tool(
            "openrouter_create_preset_chat_completions",
            {"slug": slug, "workspace_id": workspace_id},
            lambda: client.request(
                "POST",
                f"/presets/{quote(slug, safe='')}/chat/completions",
                query={"workspace_id": workspace_id},
                body=body,
            ),
        )

    @mcp.tool(
        name="openrouter_create_preset_messages",
        description=(
            "Create or overwrite a preset from an Anthropic-style messages request body. "
            "Management key required."
        ),
    )
    def openrouter_create_preset_messages(
        slug: Annotated[str, _SLUG],
        body: Annotated[dict[str, Any], _BODY],
        workspace_id: Annotated[str | None, _WS] = None,
    ) -> Any:
        return run_tool(
            "openrouter_create_preset_messages",
            {"slug": slug, "workspace_id": workspace_id},
            lambda: client.request(
                "POST",
                f"/presets/{quote(slug, safe='')}/messages",
                query={"workspace_id": workspace_id},
                body=body,
            ),
        )

    @mcp.tool(
        name="openrouter_create_preset_responses",
        description=(
            "Create or overwrite a preset from a Responses API request body. "
            "Management key required."
        ),
    )
    def openrouter_create_preset_responses(
        slug: Annotated[str, _SLUG],
        body: Annotated[dict[str, Any], _BODY],
        workspace_id: Annotated[str | None, _WS] = None,
    ) -> Any:
        return run_tool(
            "openrouter_create_preset_responses",
            {"slug": slug, "workspace_id": workspace_id},
            lambda: client.request(
                "POST",
                f"/presets/{quote(slug, safe='')}/responses",
                query={"workspace_id": workspace_id},
                body=body,
            ),
        )
