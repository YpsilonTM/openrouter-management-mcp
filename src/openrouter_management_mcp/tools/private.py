"""Private provider and private endpoint tools."""

from __future__ import annotations

from typing import Annotated, Any
from urllib.parse import quote

from fastmcp import FastMCP

from openrouter_management_mcp.client import OpenRouterManagementClient
from openrouter_management_mcp.tools.helpers import UNSET, body_updates, defined, run_tool

_PROVIDER_SLUG = "Private provider slug."
_ENDPOINT_ID = "Private endpoint UUID."
_WORKSPACE = "Workspace UUID (from openrouter_list_workspaces)."
_CONFIRM = "Must be true to confirm this destructive action."
_OFFSET = "Records to skip."
_PAGE = "Max records (1-100)."
_JSON = "JSON object passed through to the OpenRouter API."


def register_private_tools(mcp: FastMCP, client: OpenRouterManagementClient) -> None:
    @mcp.tool(
        name="openrouter_list_private_providers",
        description="List private providers for the organization.",
    )
    def openrouter_list_private_providers(
        offset: Annotated[int | None, _OFFSET] = None,
        limit: Annotated[int | None, _PAGE] = None,
    ) -> Any:
        query = {"offset": offset, "limit": limit}

        def _run() -> Any:
            return client.request("GET", "/private-providers", query=query)

        return run_tool("openrouter_list_private_providers", query, _run)

    @mcp.tool(
        name="openrouter_get_private_provider",
        description="Get one private provider by slug.",
    )
    def openrouter_get_private_provider(slug: Annotated[str, _PROVIDER_SLUG]) -> Any:
        def _run() -> Any:
            return client.request("GET", f"/private-providers/{quote(slug, safe='')}")

        return run_tool("openrouter_get_private_provider", {"slug": slug}, _run)

    @mcp.tool(
        name="openrouter_create_private_provider",
        description="Create a private provider.",
    )
    def openrouter_create_private_provider(
        name: Annotated[str, "Provider name."],
        slug: Annotated[str | None, "Provider slug. Omitted to let the API assign one."] = None,
        display_name: Annotated[str | None, "Display name."] = None,
        base_url: Annotated[str | None, "Upstream base URL."] = None,
    ) -> Any:
        def _run() -> Any:
            return client.request(
                "POST",
                "/private-providers",
                body=defined(
                    {
                        "name": name,
                        "slug": slug,
                        "display_name": display_name,
                        "base_url": base_url,
                    }
                ),
            )

        return run_tool("openrouter_create_private_provider", {"name": name}, _run)

    @mcp.tool(
        name="openrouter_update_private_provider",
        description="Update a private provider's display_name or base_url.",
    )
    def openrouter_update_private_provider(
        slug: Annotated[str, _PROVIDER_SLUG],
        display_name: Annotated[str | None, "Display name."] = UNSET,
        base_url: Annotated[str | None, "Upstream base URL."] = UNSET,
    ) -> Any:
        def _run() -> Any:
            body = body_updates({"display_name": display_name, "base_url": base_url})
            if not body:
                raise RuntimeError("Nothing to update.")
            return client.request(
                "PATCH",
                f"/private-providers/{quote(slug, safe='')}",
                body=body,
            )

        return run_tool("openrouter_update_private_provider", {"slug": slug}, _run)

    @mcp.tool(
        name="openrouter_delete_private_provider",
        description="Delete a private provider.",
    )
    def openrouter_delete_private_provider(
        slug: Annotated[str, _PROVIDER_SLUG],
        confirm: Annotated[bool, _CONFIRM],
    ) -> Any:
        def _run() -> Any:
            if confirm is not True:
                raise RuntimeError("confirm must be true")
            return client.request("DELETE", f"/private-providers/{quote(slug, safe='')}")

        return run_tool("openrouter_delete_private_provider", {"slug": slug}, _run)

    @mcp.tool(
        name="openrouter_list_private_endpoints",
        description=(
            "List private endpoints including drafts. Requires private-endpoints entitlement."
        ),
    )
    def openrouter_list_private_endpoints(
        offset: Annotated[int | None, _OFFSET] = None,
        limit: Annotated[int | None, _PAGE] = None,
    ) -> Any:
        query = {"offset": offset, "limit": limit}

        def _run() -> Any:
            return client.request("GET", "/private-endpoints", query=query)

        return run_tool("openrouter_list_private_endpoints", query, _run)

    @mcp.tool(
        name="openrouter_get_private_endpoint",
        description="Get one private endpoint by id.",
    )
    def openrouter_get_private_endpoint(id: Annotated[str, _ENDPOINT_ID]) -> Any:
        def _run() -> Any:
            return client.request("GET", f"/private-endpoints/{quote(id, safe='')}")

        return run_tool("openrouter_get_private_endpoint", {"id": id}, _run)

    @mcp.tool(
        name="openrouter_create_private_endpoint",
        description="Create a private endpoint draft (or activate immediately if activate=true).",
    )
    def openrouter_create_private_endpoint(
        model_permaslug: Annotated[str, "Model permaslug."],
        provider_slug: Annotated[str, "Private provider slug."],
        upstream_model_id: Annotated[str, "Upstream model id."],
        activate: Annotated[bool | None, "Activate immediately instead of leaving a draft."] = None,
        base_url: Annotated[str | None, "Upstream base URL."] = None,
        declared_parameters: Annotated[dict[str, Any] | None, _JSON] = None,
        declared_region: Annotated[str | None, "Declared region. Null clears."] = None,
        declared_zdr: Annotated[
            bool | None, "Declared zero-data-retention flag. Null clears."
        ] = None,
        pricing: Annotated[dict[str, Any] | None, _JSON] = None,
        settings: Annotated[dict[str, Any] | None, _JSON] = None,
    ) -> Any:
        def _run() -> Any:
            return client.request(
                "POST",
                "/private-endpoints",
                body=defined(
                    {
                        "model_permaslug": model_permaslug,
                        "provider_slug": provider_slug,
                        "upstream_model_id": upstream_model_id,
                        "activate": activate,
                        "base_url": base_url,
                        "declared_parameters": declared_parameters,
                        "declared_region": declared_region,
                        "declared_zdr": declared_zdr,
                        "pricing": pricing,
                        "settings": settings,
                    }
                ),
            )

        return run_tool(
            "openrouter_create_private_endpoint",
            {"model_permaslug": model_permaslug, "provider_slug": provider_slug},
            _run,
        )

    @mcp.tool(
        name="openrouter_update_private_endpoint",
        description="Update a private endpoint. Only passed fields change.",
    )
    def openrouter_update_private_endpoint(
        id: Annotated[str, _ENDPOINT_ID],
        base_url: Annotated[str | None, "Upstream base URL."] = UNSET,
        declared_parameters: Annotated[dict[str, Any] | None, _JSON] = UNSET,
        declared_region: Annotated[str | None, "Declared region. Null clears."] = UNSET,
        declared_zdr: Annotated[
            bool | None, "Declared zero-data-retention flag. Null clears."
        ] = UNSET,
        pricing: Annotated[dict[str, Any] | None, _JSON] = UNSET,
        settings: Annotated[dict[str, Any] | None, _JSON] = UNSET,
        upstream_model_id: Annotated[str | None, "Upstream model id."] = UNSET,
    ) -> Any:
        def _run() -> Any:
            body = body_updates(
                {
                    "base_url": base_url,
                    "declared_parameters": declared_parameters,
                    "declared_region": declared_region,
                    "declared_zdr": declared_zdr,
                    "pricing": pricing,
                    "settings": settings,
                    "upstream_model_id": upstream_model_id,
                }
            )
            if not body:
                raise RuntimeError("Nothing to update.")
            return client.request("PATCH", f"/private-endpoints/{quote(id, safe='')}", body=body)

        return run_tool("openrouter_update_private_endpoint", {"id": id}, _run)

    @mcp.tool(
        name="openrouter_delete_private_endpoint",
        description="Delete a private endpoint. Set draft_only=true to only delete drafts.",
    )
    def openrouter_delete_private_endpoint(
        id: Annotated[str, _ENDPOINT_ID],
        confirm: Annotated[bool, _CONFIRM],
        draft_only: Annotated[bool | None, "When true, only delete drafts."] = None,
    ) -> Any:
        def _run() -> Any:
            if confirm is not True:
                raise RuntimeError("confirm must be true")
            return client.request(
                "DELETE",
                f"/private-endpoints/{quote(id, safe='')}",
                query={"draft_only": draft_only},
            )

        return run_tool("openrouter_delete_private_endpoint", {"id": id}, _run)

    @mcp.tool(
        name="openrouter_validate_private_endpoint",
        description="Validate a draft private endpoint against a workspace.",
    )
    def openrouter_validate_private_endpoint(
        id: Annotated[str, _ENDPOINT_ID],
        workspace_id: Annotated[str, _WORKSPACE],
    ) -> Any:
        def _run() -> Any:
            return client.request(
                "POST",
                f"/private-endpoints/{quote(id, safe='')}/validate",
                body={"workspace_id": workspace_id},
            )

        return run_tool(
            "openrouter_validate_private_endpoint",
            {"id": id, "workspace_id": workspace_id},
            _run,
        )

    @mcp.tool(
        name="openrouter_activate_private_endpoint",
        description="Activate a validated private endpoint.",
    )
    def openrouter_activate_private_endpoint(id: Annotated[str, _ENDPOINT_ID]) -> Any:
        def _run() -> Any:
            return client.request("POST", f"/private-endpoints/{quote(id, safe='')}/activate")

        return run_tool("openrouter_activate_private_endpoint", {"id": id}, _run)

    @mcp.tool(
        name="openrouter_enable_private_endpoint",
        description="Enable a disabled private endpoint.",
    )
    def openrouter_enable_private_endpoint(id: Annotated[str, _ENDPOINT_ID]) -> Any:
        def _run() -> Any:
            return client.request("POST", f"/private-endpoints/{quote(id, safe='')}/enable")

        return run_tool("openrouter_enable_private_endpoint", {"id": id}, _run)

    @mcp.tool(
        name="openrouter_disable_private_endpoint",
        description="Disable a private endpoint.",
    )
    def openrouter_disable_private_endpoint(
        id: Annotated[str, _ENDPOINT_ID],
        confirm: Annotated[bool, _CONFIRM],
    ) -> Any:
        def _run() -> Any:
            if confirm is not True:
                raise RuntimeError("confirm must be true")
            return client.request("POST", f"/private-endpoints/{quote(id, safe='')}/disable")

        return run_tool("openrouter_disable_private_endpoint", {"id": id}, _run)
