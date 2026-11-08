"""Tool logic smoke tests (direct calls via FastMCP tool functions)."""

from __future__ import annotations

import json
from typing import Any

import httpx
import pytest
from fastmcp.exceptions import ToolError

from conftest import json_response, make_client
from openrouter_management_mcp.server import create_mcp_server


async def _call(mcp: Any, name: str, arguments: dict[str, Any] | None = None) -> Any:
    result = await mcp.call_tool(name, arguments or {})
    # FastMCP may wrap content
    if hasattr(result, "data"):
        return result.data
    if isinstance(result, dict):
        return result
    # ToolResult with content blocks
    content = getattr(result, "content", None)
    if content:
        text = "".join(getattr(c, "text", str(c)) for c in content)
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            return text
    return result


@pytest.mark.asyncio
async def test_tool_count(recorded: list[httpx.Request]) -> None:
    client = make_client(lambda _r: json_response({}), recorded)
    mcp = create_mcp_server(client)
    tools = await mcp.list_tools()
    assert len(tools) == 101


@pytest.mark.asyncio
async def test_get_credits_computes_remaining(recorded: list[httpx.Request]) -> None:
    client = make_client(
        lambda _r: json_response({"data": {"total_credits": 100.5, "total_usage": 25.75}}),
        recorded,
    )
    mcp = create_mcp_server(client)
    data = await _call(mcp, "openrouter_get_credits")
    assert data == {"total_credits": 100.5, "total_usage": 25.75, "remaining": 74.75}


@pytest.mark.asyncio
async def test_list_keys_name_contains(recorded: list[httpx.Request]) -> None:
    page1 = [
        {"hash": f"h{i}", "name": "other" if i != 42 else "HomeServer prod"} for i in range(100)
    ]
    page2 = [{"hash": "h100", "name": "homeserver-dev"}, {"hash": "h101", "name": "laptop"}]

    def responder(request: httpx.Request) -> httpx.Response:
        offset = int(request.url.params.get("offset") or "0")
        data = page1 if offset == 0 else page2 if offset == 100 else []
        return json_response({"data": data})

    client = make_client(responder, recorded)
    mcp = create_mcp_server(client)
    data = await _call(mcp, "openrouter_list_keys", {"name_contains": "homeserver"})
    assert [k["hash"] for k in data["data"]] == ["h42", "h100"]
    assert data["scanned"] == 102


@pytest.mark.asyncio
async def test_update_key_daily_limit(recorded: list[httpx.Request]) -> None:
    client = make_client(lambda _r: json_response({"data": {}}), recorded)
    mcp = create_mcp_server(client)
    await _call(
        mcp,
        "openrouter_update_key",
        {"hash": "abc", "limit": 5, "limit_reset": "daily"},
    )
    assert recorded[0].method == "PATCH"
    assert recorded[0].url.path.endswith("/keys/abc")
    assert json.loads(recorded[0].content) == {"limit": 5, "limit_reset": "daily"}


@pytest.mark.asyncio
async def test_delete_key_requires_confirm(recorded: list[httpx.Request]) -> None:
    client = make_client(lambda _r: json_response({"deleted": True}), recorded)
    mcp = create_mcp_server(client)
    with pytest.raises(ToolError, match="confirm"):
        await _call(mcp, "openrouter_delete_key", {"hash": "abc", "confirm": False})
    assert recorded == []


@pytest.mark.asyncio
async def test_set_workspace_budget(recorded: list[httpx.Request]) -> None:
    client = make_client(lambda _r: json_response({"data": {}}), recorded)
    mcp = create_mcp_server(client)
    await _call(
        mcp,
        "openrouter_set_workspace_budget",
        {"workspace": "default", "interval": "monthly", "limit_usd": 20},
    )
    assert recorded[0].method == "PUT"
    assert "/workspaces/default/budgets/monthly" in str(recorded[0].url)
    assert json.loads(recorded[0].content) == {"limit_usd": 20}


@pytest.mark.asyncio
async def test_create_guardrail(recorded: list[httpx.Request]) -> None:
    client = make_client(lambda _r: json_response({"data": {"id": "g1"}}, status=201), recorded)
    mcp = create_mcp_server(client)
    await _call(
        mcp,
        "openrouter_create_guardrail",
        {
            "name": "Strict",
            "allowed_providers": ["openai"],
            "limit_usd": 10,
            "reset_interval": "daily",
        },
    )
    body = json.loads(recorded[0].content)
    assert body["name"] == "Strict"
    assert body["allowed_providers"] == ["openai"]


@pytest.mark.asyncio
async def test_get_activity_maps_group_by(recorded: list[httpx.Request]) -> None:
    client = make_client(lambda _r: json_response({"data": []}), recorded)
    mcp = create_mcp_server(client)
    await _call(
        mcp,
        "openrouter_get_activity",
        {"api_key_hash": "abc", "group_by_workspace": True},
    )
    assert recorded[0].url.params.get("api_key_hash") == "abc"
    assert recorded[0].url.params.get("group_by") == "workspace"
