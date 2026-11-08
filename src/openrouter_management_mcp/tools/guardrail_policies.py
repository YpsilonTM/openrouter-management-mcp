"""Guardrail policy tools (account, scoped, and assignments)."""

from __future__ import annotations

from typing import Annotated, Any, Literal
from urllib.parse import quote

from fastmcp import FastMCP

from openrouter_management_mcp.client import OpenRouterManagementClient
from openrouter_management_mcp.tools.helpers import UNSET, body_updates, defined, run_tool

PolicyType = Literal["budget", "model_availability", "moderation", "rate_limit"]

_SCOPED_POLICY_LITERAL: dict[str, Any] = {
    "budget": Literal["budget"],
    "moderation": Literal["moderation"],
    "model_availability": Literal["model_availability"],
}

_POLICY_ID = "Policy UUID."
_WORKSPACE = "Workspace UUID (from openrouter_list_workspaces)."
_NAME = "Policy name (1-255 characters)."
_CONFIG = (
    "Policy config object (shape depends on policy_type; see OpenRouter docs / "
    "openrouter_list_*_policies examples)."
)
_JSON = "JSON object passed through to the OpenRouter API."
_POLICY_TYPE = "budget, model_availability, moderation, or rate_limit."
_KEYS = "API key hashes this policy applies to."
_MEMBERS = "Member user ids this policy applies to."
_OPTED_KEYS = "API key hashes opted out of this policy."
_OPTED_MEMBERS = "Member user ids opted out of this policy."
_DEFAULT = "Set this policy as the workspace default."
_CONFIRM = "Must be true to confirm this destructive action."
_OFFSET = "Records to skip."
_PAGE = "Max records (1-100)."
_ASSIGNED = "true assigns this policy; false clears that type for the subject."
_EXPECTED = "Optimistic concurrency: expected current assigned state."
_FLOOR = "Reassign workspaces to another floor policy: {policy_id, workspace_ids}."


def _register_scoped_policy_tools(
    mcp: FastMCP,
    client: OpenRouterManagementClient,
    *,
    kind: str,
    policy_type: str,
    label: str,
) -> None:
    base = f"/guardrails/policies/{kind}"
    slug = kind.replace("-", "_")
    list_name = f"openrouter_list_{slug}_policies"
    get_name = f"openrouter_get_{slug}_policy"
    create_name = f"openrouter_create_{slug}_policy"
    update_name = f"openrouter_update_{slug}_policy"
    delete_name = f"openrouter_delete_{slug}_policy"
    expected_policy_type = policy_type

    @mcp.tool(
        name=list_name,
        description=f"List workspace {label} guardrail policies. Requires workspace_id.",
    )
    def list_policies(
        workspace_id: Annotated[str, _WORKSPACE],
        offset: Annotated[int | None, _OFFSET] = None,
        limit: Annotated[int | None, _PAGE] = None,
    ) -> Any:
        query = {"workspace_id": workspace_id, "offset": offset, "limit": limit}

        def _run() -> Any:
            return client.request("GET", base, query=query)

        return run_tool(list_name, query, _run)

    @mcp.tool(
        name=get_name,
        description=f"Get one {label} policy by id.",
    )
    def get_policy(
        id: Annotated[str, _POLICY_ID],
        workspace_id: Annotated[str, _WORKSPACE],
    ) -> Any:
        def _run() -> Any:
            return client.request(
                "GET",
                f"{base}/{quote(id, safe='')}",
                query={"workspace_id": workspace_id},
            )

        return run_tool(get_name, {"id": id, "workspace_id": workspace_id}, _run)

    def create_policy(
        name: Annotated[str, _NAME],
        config: Annotated[dict[str, Any], _CONFIG],
        workspace_id: Annotated[str, _WORKSPACE],
        policy_type: str,
        api_key_hashes: Annotated[list[str] | None, _KEYS] = None,
        member_ids: Annotated[list[str] | None, _MEMBERS] = None,
        opted_out_api_key_hashes: Annotated[list[str] | None, _OPTED_KEYS] = None,
        opted_out_member_ids: Annotated[list[str] | None, _OPTED_MEMBERS] = None,
        is_workspace_default: Annotated[bool | None, _DEFAULT] = None,
    ) -> Any:
        def _run() -> Any:
            if policy_type != expected_policy_type:
                raise RuntimeError(f'policy_type must be "{expected_policy_type}"')
            return client.request(
                "POST",
                base,
                body=defined(
                    {
                        "name": name,
                        "config": config,
                        "workspace_id": workspace_id,
                        "policy_type": policy_type,
                        "api_key_hashes": api_key_hashes,
                        "member_ids": member_ids,
                        "opted_out_api_key_hashes": opted_out_api_key_hashes,
                        "opted_out_member_ids": opted_out_member_ids,
                        "is_workspace_default": is_workspace_default,
                    }
                ),
            )

        return run_tool(
            create_name,
            {"name": name, "workspace_id": workspace_id},
            _run,
        )

    annotations = dict(create_policy.__annotations__)
    annotations["policy_type"] = Annotated[
        _SCOPED_POLICY_LITERAL[expected_policy_type],
        f'Must be "{expected_policy_type}".',
    ]
    create_policy.__annotations__ = annotations
    mcp.tool(
        name=create_name,
        description=f"Create a {label} guardrail policy in a workspace.",
    )(create_policy)

    @mcp.tool(
        name=update_name,
        description=f"Replace a {label} policy (PUT).",
    )
    def update_policy(
        id: Annotated[str, _POLICY_ID],
        name: Annotated[str, _NAME],
        config: Annotated[dict[str, Any], _CONFIG],
        workspace_id: Annotated[str, _WORKSPACE],
        api_key_hashes: Annotated[list[str] | None, _KEYS] = UNSET,
        member_ids: Annotated[list[str] | None, _MEMBERS] = UNSET,
        opted_out_api_key_hashes: Annotated[list[str] | None, _OPTED_KEYS] = UNSET,
        opted_out_member_ids: Annotated[list[str] | None, _OPTED_MEMBERS] = UNSET,
        is_workspace_default: Annotated[bool | None, _DEFAULT] = UNSET,
    ) -> Any:
        def _run() -> Any:
            body = body_updates(
                {
                    "name": name,
                    "config": config,
                    "workspace_id": workspace_id,
                    "api_key_hashes": api_key_hashes,
                    "member_ids": member_ids,
                    "opted_out_api_key_hashes": opted_out_api_key_hashes,
                    "opted_out_member_ids": opted_out_member_ids,
                    "is_workspace_default": is_workspace_default,
                }
            )
            if not body:
                raise RuntimeError("Nothing to update.")
            return client.request("PUT", f"{base}/{quote(id, safe='')}", body=body)

        return run_tool(update_name, {"id": id, "name": name}, _run)

    @mcp.tool(
        name=delete_name,
        description=f"Delete a {label} policy.",
    )
    def delete_policy(
        id: Annotated[str, _POLICY_ID],
        workspace_id: Annotated[str, _WORKSPACE],
        confirm: Annotated[bool, _CONFIRM],
    ) -> Any:
        def _run() -> Any:
            if confirm is not True:
                raise RuntimeError("confirm must be true")
            return client.request(
                "DELETE",
                f"{base}/{quote(id, safe='')}",
                query={"workspace_id": workspace_id},
            )

        return run_tool(delete_name, {"id": id, "workspace_id": workspace_id}, _run)


def register_guardrail_policy_tools(mcp: FastMCP, client: OpenRouterManagementClient) -> None:
    @mcp.tool(
        name="openrouter_list_account_policies",
        description=(
            "List account-level / workspace-wide guardrail policies (floors applied across "
            "workspaces)."
        ),
    )
    def openrouter_list_account_policies(
        offset: Annotated[int | None, _OFFSET] = None,
        limit: Annotated[int | None, _PAGE] = None,
    ) -> Any:
        query = {"offset": offset, "limit": limit}

        def _run() -> Any:
            return client.request("GET", "/guardrails/policies/account", query=query)

        return run_tool("openrouter_list_account_policies", query, _run)

    @mcp.tool(
        name="openrouter_create_account_policy",
        description=(
            "Create an account-level policy. policy_type + config shape must match "
            "OpenRouter (budget / model_availability / moderation / rate_limit). Pass "
            "config as a JSON object."
        ),
    )
    def openrouter_create_account_policy(
        name: Annotated[str, _NAME],
        policy_type: Annotated[PolicyType, _POLICY_TYPE],
        config: Annotated[dict[str, Any], _JSON],
        is_default: Annotated[bool | None, "Whether this account policy is the default."] = None,
        keep_previous_default_workspaces: Annotated[
            bool | None, "Keep the previous default on existing workspaces."
        ] = None,
        workspace_ids: Annotated[
            list[str] | None, "Workspace UUIDs this policy applies to."
        ] = None,
        opted_out_workspace_ids: Annotated[
            list[str] | None, "Workspace UUIDs opted out of this policy."
        ] = None,
        released_floor_workspace_ids: Annotated[
            list[str] | None, "Workspace UUIDs released from the floor."
        ] = None,
        floor_reassignment: Annotated[dict[str, Any] | None, _FLOOR] = None,
    ) -> Any:
        def _run() -> Any:
            return client.request(
                "POST",
                "/guardrails/policies/account",
                body=defined(
                    {
                        "name": name,
                        "policy_type": policy_type,
                        "config": config,
                        "is_default": is_default,
                        "keep_previous_default_workspaces": keep_previous_default_workspaces,
                        "workspace_ids": workspace_ids,
                        "opted_out_workspace_ids": opted_out_workspace_ids,
                        "released_floor_workspace_ids": released_floor_workspace_ids,
                        "floor_reassignment": floor_reassignment,
                    }
                ),
            )

        return run_tool("openrouter_create_account_policy", {"name": name}, _run)

    @mcp.tool(
        name="openrouter_update_account_policy",
        description="Replace an account-level policy (PUT).",
    )
    def openrouter_update_account_policy(
        id: Annotated[str, _POLICY_ID],
        name: Annotated[str, _NAME],
        policy_type: Annotated[PolicyType, _POLICY_TYPE],
        config: Annotated[dict[str, Any], _JSON],
        is_default: Annotated[bool | None, "Whether this account policy is the default."] = UNSET,
        keep_previous_default_workspaces: Annotated[
            bool | None, "Keep the previous default on existing workspaces."
        ] = UNSET,
        workspace_ids: Annotated[
            list[str] | None, "Workspace UUIDs this policy applies to."
        ] = UNSET,
        opted_out_workspace_ids: Annotated[
            list[str] | None, "Workspace UUIDs opted out of this policy."
        ] = UNSET,
        released_floor_workspace_ids: Annotated[
            list[str] | None, "Workspace UUIDs released from the floor."
        ] = UNSET,
        floor_reassignment: Annotated[dict[str, Any] | None, _FLOOR] = UNSET,
    ) -> Any:
        def _run() -> Any:
            body = body_updates(
                {
                    "name": name,
                    "policy_type": policy_type,
                    "config": config,
                    "is_default": is_default,
                    "keep_previous_default_workspaces": keep_previous_default_workspaces,
                    "workspace_ids": workspace_ids,
                    "opted_out_workspace_ids": opted_out_workspace_ids,
                    "released_floor_workspace_ids": released_floor_workspace_ids,
                    "floor_reassignment": floor_reassignment,
                }
            )
            if not body:
                raise RuntimeError("Nothing to update.")
            return client.request(
                "PUT",
                f"/guardrails/policies/account/{quote(id, safe='')}",
                body=body,
            )

        return run_tool("openrouter_update_account_policy", {"id": id, "name": name}, _run)

    @mcp.tool(
        name="openrouter_delete_account_policy",
        description="Delete an account-level policy.",
    )
    def openrouter_delete_account_policy(
        id: Annotated[str, _POLICY_ID],
        confirm: Annotated[bool, _CONFIRM],
    ) -> Any:
        def _run() -> Any:
            if confirm is not True:
                raise RuntimeError("confirm must be true")
            return client.request("DELETE", f"/guardrails/policies/account/{quote(id, safe='')}")

        return run_tool("openrouter_delete_account_policy", {"id": id}, _run)

    for kind, policy_type, label in (
        ("budget", "budget", "budget"),
        ("moderation", "moderation", "moderation"),
        ("model-availability", "model_availability", "model availability"),
    ):
        _register_scoped_policy_tools(
            mcp,
            client,
            kind=kind,
            policy_type=policy_type,
            label=label,
        )

    @mcp.tool(
        name="openrouter_get_api_key_policy_assignment",
        description="Get which policy of a given type is assigned to an API key.",
    )
    def openrouter_get_api_key_policy_assignment(
        hash: Annotated[str, "API key hash."],
        workspace_id: Annotated[str, _WORKSPACE],
        policy_type: Annotated[PolicyType, _POLICY_TYPE],
    ) -> Any:
        def _run() -> Any:
            return client.request(
                "GET",
                f"/guardrails/policies/assignments/api-keys/{quote(hash, safe='')}",
                query={"workspace_id": workspace_id, "policy_type": policy_type},
            )

        return run_tool(
            "openrouter_get_api_key_policy_assignment",
            {"hash": hash, "workspace_id": workspace_id, "policy_type": policy_type},
            _run,
        )

    @mcp.tool(
        name="openrouter_set_api_key_policy_assignment",
        description="Assign or clear a policy of one type on an API key.",
    )
    def openrouter_set_api_key_policy_assignment(
        hash: Annotated[str, "API key hash."],
        workspace_id: Annotated[str, _WORKSPACE],
        policy_type: Annotated[PolicyType, _POLICY_TYPE],
        policy_id: Annotated[str, _POLICY_ID],
        assigned: Annotated[bool, _ASSIGNED],
        expected_assignment: Annotated[bool, _EXPECTED],
    ) -> Any:
        body = {
            "workspace_id": workspace_id,
            "policy_type": policy_type,
            "policy_id": policy_id,
            "assigned": assigned,
            "expected_assignment": expected_assignment,
        }

        def _run() -> Any:
            return client.request(
                "PUT",
                f"/guardrails/policies/assignments/api-keys/{quote(hash, safe='')}",
                body=body,
            )

        return run_tool(
            "openrouter_set_api_key_policy_assignment",
            {"hash": hash, **body},
            _run,
        )

    @mcp.tool(
        name="openrouter_get_member_policy_assignment",
        description="Get which policy of a given type is assigned to an org member.",
    )
    def openrouter_get_member_policy_assignment(
        member_id: Annotated[str, "Member user id."],
        workspace_id: Annotated[str, _WORKSPACE],
        policy_type: Annotated[PolicyType, _POLICY_TYPE],
    ) -> Any:
        def _run() -> Any:
            return client.request(
                "GET",
                f"/guardrails/policies/assignments/members/{quote(member_id, safe='')}",
                query={"workspace_id": workspace_id, "policy_type": policy_type},
            )

        return run_tool(
            "openrouter_get_member_policy_assignment",
            {
                "member_id": member_id,
                "workspace_id": workspace_id,
                "policy_type": policy_type,
            },
            _run,
        )

    @mcp.tool(
        name="openrouter_set_member_policy_assignment",
        description="Assign or clear a policy of one type on an organization member.",
    )
    def openrouter_set_member_policy_assignment(
        member_id: Annotated[str, "Member user id."],
        workspace_id: Annotated[str, _WORKSPACE],
        policy_type: Annotated[PolicyType, _POLICY_TYPE],
        policy_id: Annotated[str, _POLICY_ID],
        assigned: Annotated[bool, _ASSIGNED],
        expected_assignment: Annotated[bool, _EXPECTED],
    ) -> Any:
        body = {
            "workspace_id": workspace_id,
            "policy_type": policy_type,
            "policy_id": policy_id,
            "assigned": assigned,
            "expected_assignment": expected_assignment,
        }

        def _run() -> Any:
            return client.request(
                "PUT",
                f"/guardrails/policies/assignments/members/{quote(member_id, safe='')}",
                body=body,
            )

        return run_tool(
            "openrouter_set_member_policy_assignment",
            {"member_id": member_id, **body},
            _run,
        )
