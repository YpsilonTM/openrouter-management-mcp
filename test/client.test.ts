import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { OpenRouterManagementClient } from "../src/client.js";

describe("OpenRouterManagementClient", () => {
  it("aborts requests that exceed the timeout", async () => {
    const hangingFetch = ((_url: string, init?: RequestInit) =>
      new Promise((_, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal!.reason));
      })) as typeof fetch;
    const client = new OpenRouterManagementClient({
      apiKey: "k",
      fetchImpl: hangingFetch,
      timeoutMs: 50,
    });
    await assert.rejects(client.request("GET", "/credits"), /timed out after 50ms/);
  });

  it("omits undefined/null query params and strips trailing slash from base URL", async () => {
    let seen = "";
    const client = new OpenRouterManagementClient({
      apiKey: "k",
      baseUrl: "https://example.test/api/v1/",
      fetchImpl: (async (url: string) => {
        seen = url;
        return new Response("{}");
      }) as typeof fetch,
    });
    await client.request("GET", "/keys", { query: { a: undefined, b: null, c: false, d: 0 } });
    assert.equal(seen, "https://example.test/api/v1/keys?c=false&d=0");
  });
});
