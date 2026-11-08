import { createServer } from "../dist/server.js";
import { OpenRouterManagementClient } from "../dist/client.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { setLogLevel } from "../dist/log.js";

setLogLevel("error");

const api = new OpenRouterManagementClient({ apiKey: "x" });
const server = createServer(api);
const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
const client = new Client({ name: "list", version: "0.0.0" });
await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
const { tools } = await client.listTools();
const names = tools.map((t) => t.name).sort();
console.log(JSON.stringify(names, null, 2));
console.log("count", names.length);
await client.close();
await server.close();
