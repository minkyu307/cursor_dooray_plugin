import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { DOORAY_API_ENDPOINTS } from "../src/catalog.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pluginNamePattern = /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/;

test("marketplace.json lists the repo-root plugin for folder install", () => {
  const marketplace = JSON.parse(readFileSync(join(root, ".cursor-plugin/marketplace.json"), "utf8")) as {
    name: string;
    owner?: { name?: string };
    plugins?: Array<{ name?: string; source?: string }>;
  };
  assert.match(marketplace.name, /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/);
  assert.equal(marketplace.owner?.name, "minkyu-kim");
  const entry = marketplace.plugins?.find((plugin) => plugin.name === "cursor-dooray-plugin");
  assert.ok(entry, "missing cursor-dooray-plugin marketplace entry");
  assert.equal(entry?.source, "./");
});

test("plugin.json matches Cursor kebab-case requirements", () => {
  const manifest = JSON.parse(readFileSync(join(root, ".cursor-plugin/plugin.json"), "utf8")) as {
    name: string;
    displayName?: string;
    variables?: { required?: string[] };
    logo?: string;
  };
  assert.match(manifest.name, pluginNamePattern);
  assert.equal(manifest.name, "cursor-dooray-plugin");
  assert.equal(manifest.displayName, "cursor_dooray_plugin");
  assert.ok(manifest.variables?.required?.includes("DOORAY_API_TOKEN"));
  assert.equal(manifest.logo, "assets/logo.svg");
});

test("mcp.json uses plugin variables and bundled server", () => {
  const mcp = JSON.parse(readFileSync(join(root, "mcp.json"), "utf8")) as {
    mcpServers: { dooray: { command: string; args: string[]; env: Record<string, string> } };
  };
  const server = mcp.mcpServers.dooray;
  assert.equal(server.command, "node");
  assert.ok(server.args.some((arg) => arg.includes("dist/server.js")));
  assert.equal(server.env.DOORAY_API_TOKEN, "${DOORAY_API_TOKEN}");
  assert.equal(server.env.DOORAY_API_BASE_URL, "${DOORAY_API_BASE_URL}");
});

test("catalog includes core official endpoints from the Service API HTML", () => {
  const specs: string[] = DOORAY_API_ENDPOINTS.map((item) => item.spec);
  for (const spec of [
    "GET /common/v1/members/me",
    "GET /project/v1/projects",
    "POST /project/v1/projects/{project-id}/posts",
    "GET /calendar/v1/calendars/*/events",
    "POST /messenger/v1/channels/direct-send",
    "GET /wiki/v1/wikis",
    "GET /drive/v1/drives",
    "POST /reservation/v1/resource-reservations",
    "POST /contacts/v1/contacts/search",
  ]) {
    assert.ok(specs.includes(spec), `missing ${spec}`);
  }
  assert.ok(DOORAY_API_ENDPOINTS.length >= 130);
});
