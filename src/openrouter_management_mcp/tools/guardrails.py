"""Guardrail and assignment tools."""

from __future__ import annotations

from typing import Annotated, Any, Literal
from urllib.parse import quote

from fastmcp import FastMCP

from openrouter_management_mcp.client import OpenRouterManagementClient
from openrouter_management_mcp.tools.helpers import UNSET, body_updates, defined, run_tool

DataRegion = Literal["global", "europe", "us"]
GuardrailReset = Literal["daily", "weekly", "monthly"]

_GUARDRAIL_ID = "Guardrail UUID (from openrouter_list_guardrails)."
_REGIONS = (
    "Ingress regions: global=openrouter.ai, europe=eu.openrouter.ai, "
    "us=us.openrouter.ai. null = unrestricted."
)
_MODELS = "Allow-list of model slugs; null clears. Min 1 item when set."
_PROVIDERS = "Allow-list of provider IDs; null clears."
_FILTERS = "Content filter configs (see OpenRouter guardrail docs)."
_BYOK = "Count BYOK spend toward this guardrail's limit_usd."
_LIMIT = "Spend limit USD; must be paired with reset_interval."
_RESET = "Budget reset interval; null clears with limit_usd null."
_CONFIRM = "Must be true to confirm this destructive action."
_OFFSET = "Records to skip."
_PAGE = "Max records (1-100)."
_WORKSPACE = "Workspace UUID (from openrouter_list_workspaces)."


def register_guardrail_tools(mcp: FastMCP, client: OpenRouterManagementClient) -> None:
    @mcp.tool(
        name="openrouter_list_guardrails",
        description=(
            "List guardrails in a workspace (defaults to the account default workspace). "
            "A guardrail only enforces rules once assigned to keys/members, or when set as "
            "the workspace default."
        ),
    )
    def openrouter_list_guardrails(
        offset: Annotated[int | None, _OFFSET] = None,
        limit: Annotated[int | None, _PAGE] = None,
        workspace_id: Annotated[str | None, _WORKSPACE] = None,
    ) -> Any:
        query = {"offset": offset, "limit": limit, "workspace_id": workspace_id}

        def _run() -> Any:
            return client.request("GET", "/guardrails", query=query)

        return run_tool("openrouter_list_guardrails", query, _run)

    @mcp.tool(
        name="openrouter_get_guardrail",
        description="Get one guardrail by UUID.",
    )
    def openrouter_get_guardrail(id: Annotated[str, _GUARDRAIL_ID]) -> Any:
        def _run() -> Any:
            return client.request("GET", f"/guardrails/{quote(id, safe='')}")

        return run_tool("openrouter_get_guardrail", {"id": id}, _run)

    @mcp.tool(
        name="openrouter_create_guardrail",
        description=(
            "Create a guardrail. It enforces nothing until assigned to keys/members; "
            "workspace_id only places it in that workspace. To restrict all workspace "
            "traffic, update the workspace default guardrail instead."
        ),
    )
    def openrouter_create_guardrail(
        name: Annotated[str, "Guardrail name."],
        workspace_id: Annotated[
            str | None,
            "Workspace to place the guardrail in (does not auto-apply it).",
        ] = None,
        allow_safety_retention_google: Annotated[
            bool | None, "Allow Google safety retention. Null clears."
        ] = None,
        allow_safety_retention_other: Annotated[
            bool | None, "Allow other-provider safety retention. Null clears."
        ] = None,
        allowed_data_regions: Annotated[list[DataRegion] | None, _REGIONS] = None,
        allowed_models: Annotated[list[str] | None, _MODELS] = None,
        allowed_providers: Annotated[list[str] | None, _PROVIDERS] = None,
        ignored_models: Annotated[list[str] | None, "Model slugs to ignore; null clears."] = None,
        ignored_providers: Annotated[
            list[str] | None, "Provider IDs to ignore; null clears."
        ] = None,
        content_filter_builtins: Annotated[list[dict[str, Any]] | None, _FILTERS] = None,
        content_filters: Annotated[list[dict[str, Any]] | None, _FILTERS] = None,
        enable_free_model_publication: Annotated[
            bool | None, "Allow free-model publication. Null clears."
        ] = None,
        enable_free_model_training: Annotated[
            bool | None, "Allow free-model training. Null clears."
        ] = None,
        enable_paid_model_training: Annotated[
            bool | None, "Allow paid-model training. Null clears."
        ] = None,
        enforce_first_party_harness_models: Annotated[
            bool | None, "Require first-party harness models. Null clears."
        ] = None,
        enforce_zdr: Annotated[bool | None, "Enforce zero data retention. Null clears."] = None,
        enforce_zdr_anthropic: Annotated[
            bool | None, "Enforce zero data retention for Anthropic."
        ] = None,
        enforce_zdr_google: Annotated[
            bool | None, "Enforce zero data retention for Google."
        ] = None,
        enforce_zdr_openai: Annotated[
            bool | None, "Enforce zero data retention for OpenAI."
        ] = None,
        enforce_zdr_other: Annotated[
            bool | None, "Enforce zero data retention for other providers."
        ] = None,
        enforce_zdr_xai: Annotated[bool | None, "Enforce zero data retention for xAI."] = None,
        include_byok_in_budgets: Annotated[bool | None, _BYOK] = None,
        limit_usd: Annotated[float | None, _LIMIT] = None,
        reset_interval: Annotated[GuardrailReset | None, _RESET] = None,
    ) -> Any:
        def _run() -> Any:
            return client.request(
                "POST",
                "/guardrails",
                body=defined(
                    {
                        "name": name,
                        "workspace_id": workspace_id,
                        "allow_safety_retention_google": allow_safety_retention_google,
                        "allow_safety_retention_other": allow_safety_retention_other,
                        "allowed_data_regions": allowed_data_regions,
                        "allowed_models": allowed_models,
                        "allowed_providers": allowed_providers,
                        "ignored_models": ignored_models,
                        "ignored_providers": ignored_providers,
                        "content_filter_builtins": content_filter_builtins,
                        "content_filters": content_filters,
                        "enable_free_model_publication": enable_free_model_publication,
                        "enable_free_model_training": enable_free_model_training,
                        "enable_paid_model_training": enable_paid_model_training,
                        "enforce_first_party_harness_models": enforce_first_party_harness_models,
                        "enforce_zdr": enforce_zdr,
                        "enforce_zdr_anthropic": enforce_zdr_anthropic,
                        "enforce_zdr_google": enforce_zdr_google,
                        "enforce_zdr_openai": enforce_zdr_openai,
                        "enforce_zdr_other": enforce_zdr_other,
                        "enforce_zdr_xai": enforce_zdr_xai,
                        "include_byok_in_budgets": include_byok_in_budgets,
                        "limit_usd": limit_usd,
                        "reset_interval": reset_interval,
                    }
                ),
            )

        return run_tool("openrouter_create_guardrail", {"name": name}, _run)

    @mcp.tool(
        name="openrouter_update_guardrail",
        description=(
            "Update a guardrail. Only passed fields change. Pass null on list fields to clear them."
        ),
    )
    def openrouter_update_guardrail(
        id: Annotated[str, _GUARDRAIL_ID],
        name: Annotated[str | None, "Guardrail name."] = UNSET,
        allow_safety_retention_google: Annotated[
            bool | None, "Allow Google safety retention. Null clears."
        ] = UNSET,
        allow_safety_retention_other: Annotated[
            bool | None, "Allow other-provider safety retention. Null clears."
        ] = UNSET,
        allowed_data_regions: Annotated[list[DataRegion] | None, _REGIONS] = UNSET,
        allowed_models: Annotated[list[str] | None, _MODELS] = UNSET,
        allowed_providers: Annotated[list[str] | None, _PROVIDERS] = UNSET,
        ignored_models: Annotated[list[str] | None, "Model slugs to ignore; null clears."] = UNSET,
        ignored_providers: Annotated[
            list[str] | None, "Provider IDs to ignore; null clears."
        ] = UNSET,
        content_filter_builtins: Annotated[list[dict[str, Any]] | None, _FILTERS] = UNSET,
        content_filters: Annotated[list[dict[str, Any]] | None, _FILTERS] = UNSET,
        enable_free_model_publication: Annotated[
            bool | None, "Allow free-model publication. Null clears."
        ] = UNSET,
        enable_free_model_training: Annotated[
            bool | None, "Allow free-model training. Null clears."
        ] = UNSET,
        enable_paid_model_training: Annotated[
            bool | None, "Allow paid-model training. Null clears."
        ] = UNSET,
        enforce_first_party_harness_models: Annotated[
            bool | None, "Require first-party harness models. Null clears."
        ] = UNSET,
        enforce_zdr: Annotated[bool | None, "Enforce zero data retention. Null clears."] = UNSET,
        enforce_zdr_anthropic: Annotated[
            bool | None, "Enforce zero data retention for Anthropic."
        ] = UNSET,
        enforce_zdr_google: Annotated[
            bool | None, "Enforce zero data retention for Google."
        ] = UNSET,
        enforce_zdr_openai: Annotated[
            bool | None, "Enforce zero data retention for OpenAI."
        ] = UNSET,
        enforce_zdr_other: Annotated[
            bool | None, "Enforce zero data retention for other providers."
        ] = UNSET,
        enforce_zdr_xai: Annotated[bool | None, "Enforce zero data retention for xAI."] = UNSET,
        include_byok_in_budgets: Annotated[bool | None, _BYOK] = UNSET,
        limit_usd: Annotated[float | None, _LIMIT] = UNSET,
        reset_interval: Annotated[GuardrailReset | None, _RESET] = UNSET,
    ) -> Any:
        changes = {
            "name": name,
            "allow_safety_retention_google": allow_safety_retention_google,
            "allow_safety_retention_other": allow_safety_retention_other,
            "allowed_data_regions": allowed_data_regions,
            "allowed_models": allowed_models,
            "allowed_providers": allowed_providers,
            "ignored_models": ignored_models,
            "ignored_providers": ignored_providers,
            "content_filter_builtins": content_filter_builtins,
            "content_filters": content_filters,
            "enable_free_model_publication": enable_free_model_publication,
            "enable_free_model_training": enable_free_model_training,
            "enable_paid_model_training": enable_paid_model_training,
            "enforce_first_party_harness_models": enforce_first_party_harness_models,
            "enforce_zdr": enforce_zdr,
            "enforce_zdr_anthropic": enforce_zdr_anthropic,
            "enforce_zdr_google": enforce_zdr_google,
            "enforce_zdr_openai": enforce_zdr_openai,
            "enforce_zdr_other": enforce_zdr_other,
            "enforce_zdr_xai": enforce_zdr_xai,
            "include_byok_in_budgets": include_byok_in_budgets,
            "limit_usd": limit_usd,
            "reset_interval": reset_interval,
        }

        def _run() -> Any:
            body = body_updates(changes)
            if not body:
                raise RuntimeError("Nothing to update. Pass at least one guardrail field.")
            return client.request("PATCH", f"/guardrails/{quote(id, safe='')}", body=body)

        return run_tool(
            "openrouter_update_guardrail",
            {"id": id, **body_updates(changes)},
            _run,
        )

    @mcp.tool(
        name="openrouter_delete_guardrail",
        description="Permanently delete a guardrail.",
    )
    def openrouter_delete_guardrail(
        id: Annotated[str, _GUARDRAIL_ID],
        confirm: Annotated[bool, _CONFIRM],
    ) -> Any:
        def _run() -> Any:
            if confirm is not True:
                raise RuntimeError("confirm must be true")
            return client.request("DELETE", f"/guardrails/{quote(id, safe='')}")

        return run_tool("openrouter_delete_guardrail", {"id": id}, _run)

    @mcp.tool(
        name="openrouter_list_guardrail_key_assignments",
        description="List API key hashes assigned to one guardrail.",
    )
    def openrouter_list_guardrail_key_assignments(
        id: Annotated[str, _GUARDRAIL_ID],
        offset: Annotated[int | None, _OFFSET] = None,
        limit: Annotated[int | None, _PAGE] = None,
    ) -> Any:
        query = {"offset": offset, "limit": limit}

        def _run() -> Any:
            return client.request(
                "GET",
                f"/guardrails/{quote(id, safe='')}/assignments/keys",
                query=query,
            )

        return run_tool(
            "openrouter_list_guardrail_key_assignments",
            {"id": id, **query},
            _run,
        )

    @mcp.tool(
        name="openrouter_assign_guardrail_keys",
        description="Bulk-assign API keys (by hash) to a guardrail.",
    )
    def openrouter_assign_guardrail_keys(
        id: Annotated[str, _GUARDRAIL_ID],
        key_hashes: Annotated[list[str], "API key hashes to assign."],
    ) -> Any:
        def _run() -> Any:
            return client.request(
                "POST",
                f"/guardrails/{quote(id, safe='')}/assignments/keys",
                body={"key_hashes": key_hashes},
            )

        return run_tool(
            "openrouter_assign_guardrail_keys",
            {"id": id, "count": len(key_hashes)},
            _run,
        )

    @mcp.tool(
        name="openrouter_unassign_guardrail_keys",
        description="Bulk-unassign API keys from a guardrail.",
    )
    def openrouter_unassign_guardrail_keys(
        id: Annotated[str, _GUARDRAIL_ID],
        key_hashes: Annotated[list[str], "API key hashes to unassign."],
        confirm: Annotated[bool, _CONFIRM],
    ) -> Any:
        def _run() -> Any:
            if confirm is not True:
                raise RuntimeError("confirm must be true")
            return client.request(
                "POST",
                f"/guardrails/{quote(id, safe='')}/assignments/keys/remove",
                body={"key_hashes": key_hashes},
            )

        return run_tool(
            "openrouter_unassign_guardrail_keys",
            {"id": id, "count": len(key_hashes)},
            _run,
        )

    @mcp.tool(
        name="openrouter_list_guardrail_member_assignments",
        description="List organization members assigned to one guardrail.",
    )
    def openrouter_list_guardrail_member_assignments(
        id: Annotated[str, _GUARDRAIL_ID],
        offset: Annotated[int | None, _OFFSET] = None,
        limit: Annotated[int | None, _PAGE] = None,
    ) -> Any:
        query = {"offset": offset, "limit": limit}

        def _run() -> Any:
            return client.request(
                "GET",
                f"/guardrails/{quote(id, safe='')}/assignments/members",
                query=query,
            )

        return run_tool(
            "openrouter_list_guardrail_member_assignments",
            {"id": id, **query},
            _run,
        )

    @mcp.tool(
        name="openrouter_assign_guardrail_members",
        description="Bulk-assign organization members to a guardrail.",
    )
    def openrouter_assign_guardrail_members(
        id: Annotated[str, _GUARDRAIL_ID],
        member_user_ids: Annotated[list[str], "Member user ids to assign."],
    ) -> Any:
        def _run() -> Any:
            return client.request(
                "POST",
                f"/guardrails/{quote(id, safe='')}/assignments/members",
                body={"member_user_ids": member_user_ids},
            )

        return run_tool(
            "openrouter_assign_guardrail_members",
            {"id": id, "count": len(member_user_ids)},
            _run,
        )

    @mcp.tool(
        name="openrouter_unassign_guardrail_members",
        description="Bulk-unassign organization members from a guardrail.",
    )
    def openrouter_unassign_guardrail_members(
        id: Annotated[str, _GUARDRAIL_ID],
        member_user_ids: Annotated[list[str], "Member user ids to unassign."],
        confirm: Annotated[bool, _CONFIRM],
    ) -> Any:
        def _run() -> Any:
            if confirm is not True:
                raise RuntimeError("confirm must be true")
            return client.request(
                "POST",
                f"/guardrails/{quote(id, safe='')}/assignments/members/remove",
                body={"member_user_ids": member_user_ids},
            )

        return run_tool(
            "openrouter_unassign_guardrail_members",
            {"id": id, "count": len(member_user_ids)},
            _run,
        )

    @mcp.tool(
        name="openrouter_list_all_key_guardrail_assignments",
        description="List every API-key → guardrail assignment across the account.",
    )
    def openrouter_list_all_key_guardrail_assignments(
        offset: Annotated[int | None, _OFFSET] = None,
        limit: Annotated[int | None, _PAGE] = None,
    ) -> Any:
        query = {"offset": offset, "limit": limit}

        def _run() -> Any:
            return client.request("GET", "/guardrails/assignments/keys", query=query)

        return run_tool("openrouter_list_all_key_guardrail_assignments", query, _run)

    @mcp.tool(
        name="openrouter_list_all_member_guardrail_assignments",
        description="List every member → guardrail assignment across the account.",
    )
    def openrouter_list_all_member_guardrail_assignments(
        offset: Annotated[int | None, _OFFSET] = None,
        limit: Annotated[int | None, _PAGE] = None,
    ) -> Any:
        query = {"offset": offset, "limit": limit}

        def _run() -> Any:
            return client.request("GET", "/guardrails/assignments/members", query=query)

        return run_tool("openrouter_list_all_member_guardrail_assignments", query, _run)
