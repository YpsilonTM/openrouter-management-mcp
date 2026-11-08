"""Analytics meta and query tools."""

from __future__ import annotations

from typing import Annotated, Any

from fastmcp import FastMCP

from openrouter_management_mcp.client import OpenRouterManagementClient, defined
from openrouter_management_mcp.tools.helpers import run_tool


def register_analytics_tools(mcp: FastMCP, client: OpenRouterManagementClient) -> None:
    @mcp.tool(
        name="openrouter_get_analytics_meta",
        description=(
            "List available analytics metrics, dimensions, filter operators, and granularities "
            "for openrouter_query_analytics."
        ),
    )
    def openrouter_get_analytics_meta() -> Any:
        return run_tool(
            "openrouter_get_analytics_meta",
            {},
            lambda: client.request("GET", "/analytics/meta"),
        )

    @mcp.tool(
        name="openrouter_query_analytics",
        description=(
            "Run an analytics query. Call openrouter_get_analytics_meta first for valid "
            "metrics/dimensions. metrics is required."
        ),
    )
    def openrouter_query_analytics(
        metrics: Annotated[list[str], "Metric names from analytics meta."],
        dimensions: Annotated[list[str] | None, "Dimension names."] = None,
        filters: Annotated[list[dict[str, Any]] | None, "Filter objects."] = None,
        granularity: Annotated[str | None, "Time granularity."] = None,
        group_limit: Annotated[int | None, "Group limit."] = None,
        limit: Annotated[int | None, "Row limit."] = None,
        order_by: Annotated[list[dict[str, Any]] | None, "Order by specs."] = None,
        time_range: Annotated[dict[str, Any] | None, "Time range object."] = None,
        classifier_dimensions: Annotated[dict[str, Any] | None, "Classifier dimensions."] = None,
        classifier_filters: Annotated[dict[str, Any] | None, "Classifier filters."] = None,
    ) -> Any:
        body = defined(
            {
                "metrics": metrics,
                "dimensions": dimensions,
                "filters": filters,
                "granularity": granularity,
                "group_limit": group_limit,
                "limit": limit,
                "order_by": order_by,
                "time_range": time_range,
                "classifier_dimensions": classifier_dimensions,
                "classifier_filters": classifier_filters,
            }
        )
        return run_tool(
            "openrouter_query_analytics",
            {"metrics": metrics},
            lambda: client.request("POST", "/analytics/query", body=body),
        )
