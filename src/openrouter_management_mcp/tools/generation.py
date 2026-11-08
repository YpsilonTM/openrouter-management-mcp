"""Generation feedback tool."""

from __future__ import annotations

from typing import Annotated, Any

from fastmcp import FastMCP

from openrouter_management_mcp.client import OpenRouterManagementClient, defined
from openrouter_management_mcp.tools.helpers import run_tool


def register_generation_tools(mcp: FastMCP, client: OpenRouterManagementClient) -> None:
    @mcp.tool(
        name="openrouter_submit_generation_feedback",
        description="Submit thumbs-up/down (or category) feedback for a generation id.",
    )
    def openrouter_submit_generation_feedback(
        generation_id: Annotated[str, "Generation id."],
        category: Annotated[str, "Feedback category (see OpenRouter docs)."],
        comment: Annotated[str | None, "Optional comment."] = None,
    ) -> Any:
        body = defined({"generation_id": generation_id, "category": category, "comment": comment})
        return run_tool(
            "openrouter_submit_generation_feedback",
            {"generation_id": generation_id},
            lambda: client.request("POST", "/generation/feedback", body=body),
        )
