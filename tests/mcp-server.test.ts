import assert from "node:assert/strict";
import test from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { DoorayClient } from "../src/client.ts";
import { registerDoorayTools } from "../src/tools.ts";

test("MCP server lists Dooray tools and catalog", async () => {
  const fetchImpl: typeof fetch = async () =>
    new Response(JSON.stringify({ header: { isSuccessful: true, resultCode: 0 }, result: { id: "me" } }), {
      status: 200,
    });
  const server = new McpServer({ name: "cursor-dooray-plugin", version: "1.0.0" });
  registerDoorayTools(server, new DoorayClient({ token: "test", baseUrl: "https://api.dooray.com", fetchImpl }));

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test", version: "1.0.0" });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

  const listed = await client.listTools();
  const names = listed.tools.map((tool) => tool.name);
  for (const name of [
    "dooray_get_me",
    "dooray_list_projects",
    "dooray_create_post",
    "dooray_list_events",
    "dooray_send_direct_message",
    "dooray_api_call",
    "dooray_list_api_catalog",
  ]) {
    assert.ok(names.includes(name), `missing tool ${name}`);
  }
  assert.ok(names.length >= 40);

  const catalog = await client.callTool({ name: "dooray_list_api_catalog", arguments: {} });
  const content = catalog.content as Array<{ type: string; text: string }>;
  const text = content[0]?.text ?? "";
  assert.match(text, /GET \/common\/v1\/members\/me/);
  assert.match(text, /POST \/messenger\/v1\/channels\/direct-send/);

  await client.close();
  await server.close();
});
