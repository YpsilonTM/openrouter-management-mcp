"""OpenRouterManagementClient unit tests."""

from __future__ import annotations

import httpx
import pytest

from conftest import json_response, make_client
from openrouter_management_mcp.client import OpenRouterApiError, OpenRouterManagementClient


def test_omits_null_query_params(recorded: list[httpx.Request]) -> None:
    client = make_client(lambda _r: json_response({"data": []}), recorded)
    client.request("GET", "/keys", query={"a": None, "b": True, "c": 0})
    assert recorded[0].url.params.get("b") == "true"
    assert recorded[0].url.params.get("c") == "0"
    assert "a" not in recorded[0].url.params


def test_bearer_and_strips_base_slash(recorded: list[httpx.Request]) -> None:
    def responder(request: httpx.Request) -> httpx.Response:
        recorded.append(request)
        return json_response({})

    transport = httpx.MockTransport(responder)
    http = httpx.Client(transport=transport)
    client = OpenRouterManagementClient(
        api_key="sk-test",
        base_url="https://example.test/api/v1/",
        http_client=http,
    )
    client.request("GET", "/credits")
    assert str(recorded[0].url).startswith("https://example.test/api/v1/credits")
    assert recorded[0].headers["Authorization"] == "Bearer sk-test"


def test_403_includes_management_key_hint(recorded: list[httpx.Request]) -> None:
    client = make_client(
        lambda _r: json_response(
            {"error": {"message": "Only management keys can perform this operation"}},
            status=403,
        ),
        recorded,
    )
    with pytest.raises(OpenRouterApiError) as ei:
        client.request("GET", "/keys")
    assert "403" in str(ei.value)
    assert "Management API key" in str(ei.value)


def test_missing_key_raises_before_http(recorded: list[httpx.Request]) -> None:
    client = make_client(lambda _r: json_response({}), recorded, api_key="")
    with pytest.raises(RuntimeError, match="OPENROUTER_MANAGEMENT_API_KEY"):
        client.request("GET", "/credits")
    assert recorded == []
