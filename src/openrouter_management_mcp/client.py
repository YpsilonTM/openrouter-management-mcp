"""OpenRouter Management API client (httpx)."""

from __future__ import annotations

import json
import os
from typing import Any, Literal
from urllib.parse import urlencode

import httpx

from openrouter_management_mcp.log import log

DEFAULT_BASE_URL = "https://openrouter.ai/api/v1"
DEFAULT_TIMEOUT_S = 30.0

Method = Literal["GET", "POST", "PATCH", "PUT", "DELETE"]


class OpenRouterApiError(RuntimeError):
    def __init__(self, message: str, *, status: int, method: str, path: str) -> None:
        super().__init__(message)
        self.status = status
        self.method = method
        self.path = path


def _status_hint(status: int) -> str | None:
    if status == 401:
        return "OPENROUTER_MANAGEMENT_API_KEY is invalid, expired, or revoked."
    if status == 403:
        return (
            "This route needs a Management API key "
            "(https://openrouter.ai/settings/management-keys), not a regular inference key."
        )
    if status == 404:
        return "Not found. Check the hash/ID (keys are listed per workspace)."
    if status == 429:
        return "Rate limited by OpenRouter. Retry shortly."
    return None


def _extract_message(parsed: Any) -> str:
    if isinstance(parsed, str):
        return parsed or "(empty response)"
    if isinstance(parsed, dict):
        err = parsed.get("error")
        if isinstance(err, dict) and "message" in err:
            return str(err["message"])
        if isinstance(err, str):
            return err
    return json.dumps(parsed)


def defined(obj: dict[str, Any]) -> dict[str, Any]:
    """Drop keys whose value is None (keeps explicit False/0/''). Use for optional body fields."""
    return {k: v for k, v in obj.items() if v is not None}


class OpenRouterManagementClient:
    def __init__(
        self,
        *,
        api_key: str | None = None,
        base_url: str | None = None,
        http_client: httpx.Client | None = None,
        timeout_s: float = DEFAULT_TIMEOUT_S,
    ) -> None:
        self.api_key = (api_key or "").strip()
        self.base_url = (base_url or DEFAULT_BASE_URL).rstrip("/")
        self._http = http_client or httpx.Client(timeout=timeout_s)
        self._owns_http = http_client is None
        self.timeout_s = timeout_s

    @property
    def configured(self) -> bool:
        return bool(self.api_key)

    def close(self) -> None:
        if self._owns_http:
            self._http.close()

    def request(
        self,
        method: Method,
        path: str,
        *,
        query: dict[str, Any] | None = None,
        body: dict[str, Any] | None = None,
    ) -> Any:
        if not self.configured:
            raise RuntimeError(
                "OPENROUTER_MANAGEMENT_API_KEY is not set. Create a Management API key at "
                "https://openrouter.ai/settings/management-keys and add it to the MCP server "
                "environment."
            )

        params: dict[str, str] = {}
        for k, v in (query or {}).items():
            if v is not None:
                params[k] = "true" if v is True else "false" if v is False else str(v)

        qs = urlencode(params)
        url = f"{self.base_url}{path}" + (f"?{qs}" if qs else "")
        log.debug("API request", {"method": method, "path": path, "query": qs or None})

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Accept": "application/json",
        }
        content: str | None = None
        if body is not None:
            headers["Content-Type"] = "application/json"
            content = json.dumps(body)

        try:
            res = self._http.request(method, url, headers=headers, content=content)
        except httpx.TimeoutException as e:
            raise RuntimeError(
                f"OpenRouter {method} {path} failed: timed out after {self.timeout_s}s"
            ) from e
        except httpx.HTTPError as e:
            raise RuntimeError(f"OpenRouter {method} {path} failed: {e}") from e

        text = res.text
        parsed: Any = text
        if text:
            try:
                parsed = res.json()
            except json.JSONDecodeError:
                parsed = text

        if not res.is_success:
            hint = _status_hint(res.status_code)
            msg = (
                f"OpenRouter {method} {path} failed ({res.status_code}): {_extract_message(parsed)}"
            )
            if hint:
                msg += f"\nHint: {hint}"
            raise OpenRouterApiError(msg, status=res.status_code, method=method, path=path)

        return parsed


def create_client_from_env() -> OpenRouterManagementClient:
    return OpenRouterManagementClient(
        api_key=os.environ.get("OPENROUTER_MANAGEMENT_API_KEY"),
        base_url=os.environ.get("OPENROUTER_BASE_URL"),
    )
