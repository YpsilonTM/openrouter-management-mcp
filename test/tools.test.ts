import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { connect } from "./helpers.js";

const EXPECTED_TOOLS = [
  "openrouter_activate_private_endpoint",
  "openrouter_add_workspace_members",
  "openrouter_assign_guardrail_keys",
  "openrouter_assign_guardrail_members",
  "openrouter_create_account_policy",
  "openrouter_create_budget_policy",
  "openrouter_create_byok",
  "openrouter_create_external_user",
  "openrouter_create_guardrail",
  "openrouter_create_key",
  "openrouter_create_model_availability_policy",
  "openrouter_create_moderation_policy",
  "openrouter_create_observability_destination",
  "openrouter_create_preset_chat_completions",
  "openrouter_create_preset_messages",
  "openrouter_create_preset_responses",
  "openrouter_create_private_endpoint",
  "openrouter_create_private_provider",
  "openrouter_create_scim_group_mapping",
  "openrouter_create_workspace",
  "openrouter_delete_account_policy",
  "openrouter_delete_budget_policy",
  "openrouter_delete_byok",
  "openrouter_delete_external_user",
  "openrouter_delete_guardrail",
  "openrouter_delete_key",
  "openrouter_delete_model_availability_policy",
  "openrouter_delete_moderation_policy",
  "openrouter_delete_observability_destination",
  "openrouter_delete_private_endpoint",
  "openrouter_delete_private_provider",
  "openrouter_delete_scim_group_mapping",
  "openrouter_delete_workspace",
  "openrouter_delete_workspace_budget",
  "openrouter_disable_private_endpoint",
  "openrouter_enable_private_endpoint",
  "openrouter_get_activity",
  "openrouter_get_analytics_meta",
  "openrouter_get_api_key_policy_assignment",
  "openrouter_get_budget_policy",
  "openrouter_get_byok",
  "openrouter_get_credits",
  "openrouter_get_external_user",
  "openrouter_get_guardrail",
  "openrouter_get_key",
  "openrouter_get_member_policy_assignment",
  "openrouter_get_model_availability_policy",
  "openrouter_get_moderation_policy",
  "openrouter_get_observability_destination",
  "openrouter_get_organization_settings",
  "openrouter_get_private_endpoint",
  "openrouter_get_private_provider",
  "openrouter_get_scim_group_mapping",
  "openrouter_get_scim_sync_job",
  "openrouter_get_workspace",
  "openrouter_get_workspace_budget",
  "openrouter_list_account_policies",
  "openrouter_list_all_key_guardrail_assignments",
  "openrouter_list_all_member_guardrail_assignments",
  "openrouter_list_budget_policies",
  "openrouter_list_byok",
  "openrouter_list_external_users",
  "openrouter_list_guardrail_key_assignments",
  "openrouter_list_guardrail_member_assignments",
  "openrouter_list_guardrails",
  "openrouter_list_keys",
  "openrouter_list_model_availability_policies",
  "openrouter_list_moderation_policies",
  "openrouter_list_observability_destinations",
  "openrouter_list_organization_members",
  "openrouter_list_private_endpoints",
  "openrouter_list_private_providers",
  "openrouter_list_scim_group_mappings",
  "openrouter_list_scim_groups",
  "openrouter_list_workspace_budgets",
  "openrouter_list_workspace_members",
  "openrouter_list_workspaces",
  "openrouter_query_analytics",
  "openrouter_remove_workspace_members",
  "openrouter_set_api_key_policy_assignment",
  "openrouter_set_member_policy_assignment",
  "openrouter_set_workspace_budget",
  "openrouter_start_scim_sync",
  "openrouter_submit_generation_feedback",
  "openrouter_unassign_guardrail_keys",
  "openrouter_unassign_guardrail_members",
  "openrouter_update_account_policy",
  "openrouter_update_budget_policy",
  "openrouter_update_byok",
  "openrouter_update_external_user",
  "openrouter_update_guardrail",
  "openrouter_update_key",
  "openrouter_update_model_availability_policy",
  "openrouter_update_moderation_policy",
  "openrouter_update_observability_destination",
  "openrouter_update_organization_settings",
  "openrouter_update_private_endpoint",
  "openrouter_update_private_provider",
  "openrouter_update_scim_group_mapping",
  "openrouter_update_workspace",
  "openrouter_validate_private_endpoint",
];

const key = (i: number, name: string) => ({ hash: `hash${i}`, name, label: `sk-or-v1-${i}...` });

describe("tool registry", () => {
  it("exposes the expected tools with correct annotations", async () => {
    const t = await connect(() => ({}));
    const { tools } = await t.client.listTools();
    assert.deepEqual(tools.map((x) => x.name).sort(), EXPECTED_TOOLS);

    const byName = Object.fromEntries(tools.map((x) => [x.name, x]));
    assert.equal(byName.openrouter_list_keys.annotations?.readOnlyHint, true);
    assert.equal(byName.openrouter_delete_key.annotations?.destructiveHint, true);
    assert.equal(byName.openrouter_update_key.annotations?.readOnlyHint, false);
    assert.deepEqual(byName.openrouter_delete_key.inputSchema.required?.sort(), ["confirm", "hash"]);
    await t.close();
  });

  it("advertises server instructions", async () => {
    const t = await connect(() => ({}));
    assert.match(t.client.getInstructions() ?? "", /hash/);
    await t.close();
  });
});

describe("openrouter_list_keys", () => {
  it("passes filters as query params and sends the bearer token", async () => {
    const t = await connect(() => ({ body: { data: [key(1, "a")] } }));
    const res = await t.call("openrouter_list_keys", {
      include_disabled: true,
      offset: 100,
      workspace_id: "0df9e665-d932-5740-b2c7-b52af166bc11",
    });
    assert.equal(res.isError, false);
    assert.equal(t.calls.length, 1);
    assert.deepEqual(t.calls[0], {
      method: "GET",
      path: "/keys",
      query: {
        include_disabled: "true",
        offset: "100",
        workspace_id: "0df9e665-d932-5740-b2c7-b52af166bc11",
      },
      body: undefined,
      auth: "Bearer sk-or-v1-mgmt-test",
    });
    await t.close();
  });

  it("name_contains paginates and filters case-insensitively", async () => {
    const page1 = Array.from({ length: 100 }, (_, i) => key(i, i === 42 ? "HomeServer prod" : `k${i}`));
    const page2 = [key(100, "homeserver-dev"), key(101, "laptop")];
    const t = await connect((c) => ({
      body: { data: c.query.offset === "0" ? page1 : c.query.offset === "100" ? page2 : [] },
    }));
    const res = await t.call("openrouter_list_keys", { name_contains: "homeserver" });
    assert.equal(res.isError, false);
    assert.deepEqual(
      t.calls.map((c) => c.query.offset),
      ["0", "100"],
    );
    const json = res.json as { data: { hash: string }[]; scanned: number };
    assert.deepEqual(json.data.map((k) => k.hash), ["hash42", "hash100"]);
    assert.equal(json.scanned, 102);
    await t.close();
  });

  it("rejects an invalid workspace_id before calling the API", async () => {
    const t = await connect(() => ({}));
    const res = await t.call("openrouter_list_keys", { workspace_id: "not-a-uuid" });
    assert.equal(res.isError, true);
    assert.equal(t.calls.length, 0);
    await t.close();
  });
});

describe("openrouter_update_key", () => {
  it("sets a daily spend limit", async () => {
    const t = await connect((c) => ({ body: { data: { hash: "abc", ...(c.body as object) } } }));
    const res = await t.call("openrouter_update_key", { hash: "abc", limit: 5, limit_reset: "daily" });
    assert.equal(res.isError, false);
    assert.equal(t.calls[0].method, "PATCH");
    assert.equal(t.calls[0].path, "/keys/abc");
    assert.deepEqual(t.calls[0].body, { limit: 5, limit_reset: "daily" });
    await t.close();
  });

  it("maps limit=null and limit_reset=none to JSON null (remove limit)", async () => {
    const t = await connect(() => ({ body: { data: {} } }));
    await t.call("openrouter_update_key", { hash: "abc", limit: null, limit_reset: "none" });
    assert.deepEqual(t.calls[0].body, { limit: null, limit_reset: null });
    await t.close();
  });

  it("only sends fields that were provided", async () => {
    const t = await connect(() => ({ body: { data: {} } }));
    await t.call("openrouter_update_key", { hash: "abc", disabled: true });
    assert.deepEqual(t.calls[0].body, { disabled: true });
    await t.close();
  });

  it("errors without calling the API when nothing would change", async () => {
    const t = await connect(() => ({}));
    const res = await t.call("openrouter_update_key", { hash: "abc" });
    assert.equal(res.isError, true);
    assert.match(res.text, /Nothing to update/);
    assert.equal(t.calls.length, 0);
    await t.close();
  });

  it("rejects a zero or negative limit", async () => {
    const t = await connect(() => ({}));
    const res = await t.call("openrouter_update_key", { hash: "abc", limit: 0 });
    assert.equal(res.isError, true);
    assert.equal(t.calls.length, 0);
    await t.close();
  });

  it("url-encodes the hash", async () => {
    const t = await connect(() => ({ body: { data: {} } }));
    await t.call("openrouter_update_key", { hash: "a/b?c", disabled: false });
    assert.equal(t.calls[0].path, "/keys/a%2Fb%3Fc");
    await t.close();
  });
});

describe("openrouter_create_key", () => {
  it("sends the documented body and drops limit_reset=none", async () => {
    const t = await connect(() => ({
      status: 201,
      body: { data: { hash: "new" }, key: "sk-or-v1-secret" },
    }));
    const res = await t.call("openrouter_create_key", {
      name: "homeserver",
      limit: 10,
      limit_reset: "none",
      expires_at: "2027-12-31T23:59:59Z",
    });
    assert.equal(res.isError, false);
    assert.deepEqual(t.calls[0].body, {
      name: "homeserver",
      limit: 10,
      expires_at: "2027-12-31T23:59:59Z",
    });
    assert.equal((res.json as { key: string }).key, "sk-or-v1-secret");
    await t.close();
  });

  it("rejects minute-precision expires_at (API requires seconds)", async () => {
    const t = await connect(() => ({}));
    const res = await t.call("openrouter_create_key", { name: "x", expires_at: "2027-12-31T23:59Z" });
    assert.equal(res.isError, true);
    assert.equal(t.calls.length, 0);
    await t.close();
  });
});

describe("openrouter_delete_key", () => {
  it("requires confirm=true", async () => {
    const t = await connect(() => ({ body: { deleted: true } }));
    const denied = await t.call("openrouter_delete_key", { hash: "abc", confirm: false });
    assert.equal(denied.isError, true);
    assert.equal(t.calls.length, 0);

    const ok = await t.call("openrouter_delete_key", { hash: "abc", confirm: true });
    assert.equal(ok.isError, false);
    assert.equal(t.calls[0].method, "DELETE");
    assert.deepEqual(ok.json, { deleted: true });
    await t.close();
  });
});

describe("workspace budgets", () => {
  it("upserts a budget with PUT", async () => {
    const t = await connect(() => ({ body: { data: {} } }));
    await t.call("openrouter_set_workspace_budget", {
      workspace: "default",
      interval: "monthly",
      limit_usd: 20,
    });
    assert.equal(t.calls[0].method, "PUT");
    assert.equal(t.calls[0].path, "/workspaces/default/budgets/monthly");
    assert.deepEqual(t.calls[0].body, { limit_usd: 20 });
    await t.close();
  });

  it("rejects unknown intervals", async () => {
    const t = await connect(() => ({}));
    const res = await t.call("openrouter_set_workspace_budget", {
      workspace: "default",
      interval: "yearly",
      limit_usd: 20,
    });
    assert.equal(res.isError, true);
    assert.equal(t.calls.length, 0);
    await t.close();
  });
});

describe("account tools", () => {
  it("get_credits computes remaining", async () => {
    const t = await connect(() => ({ body: { data: { total_credits: 100.5, total_usage: 25.75 } } }));
    const res = await t.call("openrouter_get_credits");
    assert.deepEqual(res.json, { total_credits: 100.5, total_usage: 25.75, remaining: 74.75 });
    await t.close();
  });

  it("get_activity maps group_by_workspace", async () => {
    const t = await connect(() => ({ body: { data: [] } }));
    await t.call("openrouter_get_activity", { api_key_hash: "abc", group_by_workspace: true });
    assert.deepEqual(t.calls[0].query, { api_key_hash: "abc", group_by: "workspace" });
    await t.close();
  });
});

describe("workspaces / guardrails / byok", () => {
  it("creates a workspace", async () => {
    const t = await connect(() => ({ status: 201, body: { data: { id: "w1" } } }));
    const res = await t.call("openrouter_create_workspace", {
      name: "Prod",
      slug: "prod",
      default_provider_sort: "price",
    });
    assert.equal(res.isError, false);
    assert.equal(t.calls[0].method, "POST");
    assert.equal(t.calls[0].path, "/workspaces");
    assert.deepEqual(t.calls[0].body, {
      name: "Prod",
      slug: "prod",
      default_provider_sort: "price",
    });
    await t.close();
  });

  it("creates a guardrail and assigns keys", async () => {
    const t = await connect(() => ({ status: 201, body: { data: { id: "g1" } } }));
    const id = "550e8400-e29b-41d4-a716-446655440000";
    await t.call("openrouter_create_guardrail", {
      name: "Strict",
      allowed_providers: ["openai"],
      limit_usd: 10,
      reset_interval: "daily",
    });
    assert.equal(t.calls[0].path, "/guardrails");
    assert.equal((t.calls[0].body as { name: string }).name, "Strict");

    await t.call("openrouter_assign_guardrail_keys", { id, key_hashes: ["abc"] });
    assert.equal(t.calls[1].method, "POST");
    assert.equal(t.calls[1].path, `/guardrails/${id}/assignments/keys`);
    assert.deepEqual(t.calls[1].body, { key_hashes: ["abc"] });
    await t.close();
  });

  it("creates BYOK without logging the secret in tool log fields only via API body", async () => {
    const t = await connect(() => ({ status: 201, body: { data: { id: "b1" } } }));
    await t.call("openrouter_create_byok", {
      provider: "openai",
      key: "sk-secret",
      name: "prod",
    });
    assert.deepEqual(t.calls[0].body, {
      provider: "openai",
      key: "sk-secret",
      name: "prod",
    });
    await t.close();
  });

  it("queries analytics with metrics", async () => {
    const t = await connect(() => ({ body: { data: [] } }));
    await t.call("openrouter_query_analytics", {
      metrics: ["spend"],
      dimensions: ["model"],
    });
    assert.equal(t.calls[0].method, "POST");
    assert.equal(t.calls[0].path, "/analytics/query");
    assert.deepEqual(t.calls[0].body, { metrics: ["spend"], dimensions: ["model"] });
    await t.close();
  });
});

describe("error handling", () => {
  it("surfaces the API message plus a hint on 403", async () => {
    const t = await connect(() => ({
      status: 403,
      body: { error: { code: 403, message: "Only management keys can perform this operation" } },
    }));
    const res = await t.call("openrouter_list_keys");
    assert.equal(res.isError, true);
    assert.match(res.text, /\(403\): Only management keys can perform this operation/);
    assert.match(res.text, /Management API key/);
    await t.close();
  });

  it("get_credits falls back to the raw body on an unexpected shape", async () => {
    const t = await connect(() => ({ body: { something: "else" } }));
    const res = await t.call("openrouter_get_credits");
    assert.equal(res.isError, false);
    assert.deepEqual(res.json, { something: "else" });
    await t.close();
  });

  it("handles non-JSON error bodies", async () => {
    const t = await connect(() => ({ status: 502, body: "Bad Gateway" }));
    const res = await t.call("openrouter_get_credits");
    assert.equal(res.isError, true);
    assert.match(res.text, /\(502\): Bad Gateway/);
    await t.close();
  });

  it("starts without a key and returns a setup error from tools", async () => {
    const t = await connect(() => ({}), "");
    const { tools } = await t.client.listTools();
    assert.ok(tools.length > 0);
    const res = await t.call("openrouter_get_credits");
    assert.equal(res.isError, true);
    assert.match(res.text, /OPENROUTER_MANAGEMENT_API_KEY is not set/);
    assert.equal(t.calls.length, 0);
    await t.close();
  });
});
