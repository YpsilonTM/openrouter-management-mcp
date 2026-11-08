"""Shared helpers for tool handlers."""

from __future__ import annotations

import time
from collections.abc import Callable
from typing import Any, TypeVar

from fastmcp.exceptions import ToolError

from openrouter_management_mcp.log import log

T = TypeVar("T")


def defined(obj: dict[str, Any]) -> dict[str, Any]:
    """Drop keys whose value is None (create-style omit)."""
    return {k: v for k, v in obj.items() if v is not None}


def pick_provided(**kwargs: Any) -> dict[str, Any]:
    """
    Build a PATCH body from keyword args.

    Convention for update tools: only include keys the caller intends to send.
    Pass kwargs that were given; use a dict of candidates and drop those equal
    to the module-level sentinel via `omit_unset`.
    """
    return {k: v for k, v in kwargs.items() if v is not None}


def omit_unset(obj: dict[str, Any], *, unset: Any) -> dict[str, Any]:
    """Keep keys whose value is not `unset` (allows explicit None clears)."""
    return {k: v for k, v in obj.items() if v is not unset}


def run_tool[T](tool: str, fields: dict[str, Any], fn: Callable[[], T]) -> T:
    started = time.monotonic()
    log.info("Tool call", {"tool": tool, **fields})
    try:
        data = fn()
        log.info(
            "Tool done",
            {"tool": tool, "durationMs": int((time.monotonic() - started) * 1000)},
        )
        return data
    except Exception as e:
        log.error(
            "Tool failed",
            {
                "tool": tool,
                "durationMs": int((time.monotonic() - started) * 1000),
                "error": str(e),
            },
        )
        raise ToolError(str(e)) from e


# Back-compat aliases used by tool modules
UNSET = None  # FastMCP-safe: None means omit; use clear_* flags for API nulls
body_updates = defined
