"""Shared fixtures: httpx MockTransport + OpenRouterManagementClient."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

import httpx
import pytest

from openrouter_management_mcp.client import OpenRouterManagementClient

Responder = Callable[[httpx.Request], httpx.Response]


@pytest.fixture
def recorded() -> list[httpx.Request]:
    return []


def make_client(
    responder: Responder,
    recorded: list[httpx.Request],
    *,
    api_key: str | None = "sk-or-v1-mgmt-test",
) -> OpenRouterManagementClient:
    def handler(request: httpx.Request) -> httpx.Response:
        recorded.append(request)
        return responder(request)

    transport = httpx.MockTransport(handler)
    http = httpx.Client(transport=transport, base_url="https://openrouter.ai/api/v1")
    return OpenRouterManagementClient(api_key=api_key, http_client=http)


def json_response(body: Any = None, *, status: int = 200) -> httpx.Response:
    if body is None:
        body = {}
    return httpx.Response(status, json=body)
