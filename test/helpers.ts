import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { OpenRouterManagementClient } from "../src/client.js";
import { createServer } from "../src/server.js";
import { setLogLevel } from "../src/log.js";

setLogLevel("error");

export interface RecordedCall {
  method: string;
  path: string;
  query: Record<string, string>;
  body: unknown;
  auth: string | null;
}

export type Responder = (call: RecordedCall) => { status?: number; body?: unknown };

export function mockFetch(responder: Responder): {
  fetchImpl: typeof fetch;
  calls: RecordedCall[];
} {
  const calls: RecordedCall[] = [];
  const fetchImpl = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    const headers = new Headers(init?.headers);
    const call: RecordedCall = {
      method: init?.method ?? "GET",
      path: url.pathname.replace(/^\/api\/v1/, ""),
      query: Object.fromEntries(url.searchParams),
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
      auth: headers.get("authorization"),
    };
    calls.push(call);
    const { status = 200, body = {} } = responder(call);
    return new Response(typeof body === "string" ? body : JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
  return { fetchImpl, calls };
}

export async function connect(
  responder: Responder,
  apiKey: string | undefined = "sk-or-v1-mgmt-test",
) {
  const { fetchImpl, calls } = mockFetch(responder);
  const api = new OpenRouterManagementClient({ apiKey, fetchImpl });
  const server = createServer(api);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test", version: "0.0.0" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

  async function call(name: string, args: Record<string, unknown> = {}) {
    const res = await client.callTool({ name, arguments: args });
    const content = res.content as { type: string; text: string }[];
    const text = content.map((c) => c.text).join("\n");
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      json = undefined;
    }
    return { isError: Boolean(res.isError), text, json };
  }

  return {
    client,
    calls,
    call,
    close: async () => {
      await client.close();
      await server.close();
    },
  };
}
