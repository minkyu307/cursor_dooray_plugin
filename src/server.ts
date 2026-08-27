import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { DoorayClient } from "./client.ts";
import { readDoorayConfig } from "./env.ts";
import { registerDoorayTools } from "./tools.ts";

/**
 * Cursor stdio MCP 서버를 기동한다.
 */
async function main(): Promise<void> {
  const { token, baseUrl } = readDoorayConfig();
  const server = new McpServer({
    name: "cursor-dooray-plugin",
    version: "1.0.0",
  });
  registerDoorayTools(server, new DoorayClient({ token, baseUrl }));
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
