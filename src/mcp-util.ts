import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { DoorayApiError } from "./client.ts";

/** MCP 도구 결과를 JSON 텍스트로 반환한다. */
export function textResult(data: unknown, isError = false) {
  const text = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  return {
    content: [{ type: "text" as const, text }],
    isError,
  };
}

/** 예외를 MCP 오류 응답으로 변환한다. */
export function errorResult(error: unknown) {
  if (error instanceof DoorayApiError) {
    return textResult(
      {
        error: error.message,
        status: error.status,
        resultCode: error.resultCode,
        payload: error.payload,
      },
      true,
    );
  }
  const message = error instanceof Error ? error.message : String(error);
  return textResult({ error: message }, true);
}

type ToolHandler = (args: Record<string, unknown>) => Promise<unknown>;

/** JSON 응답을 반환하는 MCP 도구를 등록한다. */
export function registerJsonTool(
  server: McpServer,
  name: string,
  description: string,
  schema: ZodRawShape,
  handler: ToolHandler,
): void {
  const hasInput = Object.keys(schema).length > 0;
  server.registerTool(
    name,
    hasInput ? { description, inputSchema: schema } : { description },
    async (args) => {
      try {
        const result = await handler((args ?? {}) as Record<string, unknown>);
        return textResult(result);
      } catch (error) {
        return errorResult(error);
      }
    },
  );
}

/** 빈 값을 제외한 쿼리 객체를 만든다. */
export function compactQuery(input: Record<string, unknown>): Record<string, unknown> {
  const query: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    query[key] = value;
  }
  return query;
}

/** 담당자/참조자 organizationMemberId 목록을 Dooray users 객체로 변환한다. */
export function toMemberUsers(toMemberIds?: string[], ccMemberIds?: string[]) {
  const users: {
    to?: Array<{ type: "member"; member: { organizationMemberId: string } }>;
    cc?: Array<{ type: "member"; member: { organizationMemberId: string } }>;
  } = {};
  if (toMemberIds && toMemberIds.length > 0) {
    users.to = toMemberIds.map((organizationMemberId) => ({
      type: "member" as const,
      member: { organizationMemberId },
    }));
  }
  if (ccMemberIds && ccMemberIds.length > 0) {
    users.cc = ccMemberIds.map((organizationMemberId) => ({
      type: "member" as const,
      member: { organizationMemberId },
    }));
  }
  return Object.keys(users).length > 0 ? users : undefined;
}

export const pageSchema = {
  page: { description: "0부터 시작하는 페이지 번호. 기본값 0" },
  size: { description: "페이지 크기. 기본값 20, 최댓값 100" },
};
