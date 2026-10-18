import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { connect } from "./helpers.js";

const EXPECTED_TOOLS = [
  "openrouter_create_key",
  "openrouter_delete_key",
  "openrouter_delete_workspace_budget",
  "openrouter_get_activity",
  "openrouter_get_credits",
  "openrouter_get_key",
  "openrouter_list_keys",
  "openrouter_list_workspace_budgets",
  "openrouter_list_workspaces",
  "openrouter_set_workspace_budget",
  "openrouter_update_key",
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
