import assert from "node:assert/strict";
import test from "node:test";
import { DoorayApiError, DoorayClient, isDestructiveRequest, normalizeApiPath } from "../src/client.ts";
import { isUnset, readDoorayConfig } from "../src/env.ts";

test("normalizeApiPath accepts official prefixes", () => {
  assert.equal(normalizeApiPath("/project/v1/projects"), "/project/v1/projects");
  assert.equal(normalizeApiPath("/calendar/v1/calendars/*/events"), "/calendar/v1/calendars/*/events");
  assert.equal(normalizeApiPath("/messenger/v1/channels?idType=member-id"), "/messenger/v1/channels?idType=member-id");
});

test("normalizeApiPath rejects unsafe paths", () => {
  assert.throws(() => normalizeApiPath("https://evil.example/project/v1/projects"));
  assert.throws(() => normalizeApiPath("/../etc/passwd"));
  assert.throws(() => normalizeApiPath("/unknown/v1/x"));
  assert.throws(() => normalizeApiPath("//api.dooray.com/project/v1/projects"));
});

test("isDestructiveRequest covers delete and archive", () => {
  assert.equal(isDestructiveRequest("DELETE", "/wiki/v1/wikis/1/pages/2"), true);
  assert.equal(isDestructiveRequest("POST", "/calendar/v1/calendars/1/events/2/delete"), true);
  assert.equal(isDestructiveRequest("POST", "/project/v1/projects/1/set-archive"), true);
  assert.equal(isDestructiveRequest("GET", "/project/v1/projects"), false);
});

test("readDoorayConfig requires token and defaults base URL", () => {
  assert.throws(() => readDoorayConfig({}));
  assert.throws(() => readDoorayConfig({ DOORAY_API_TOKEN: "${DOORAY_API_TOKEN}" }));
  const config = readDoorayConfig({ DOORAY_API_TOKEN: "abc123" });
  assert.equal(config.token, "abc123");
  assert.equal(config.baseUrl, "https://api.dooray.com");
  const gov = readDoorayConfig({
    DOORAY_API_TOKEN: "abc123",
    DOORAY_API_BASE_URL: "https://api.gov-dooray.com/",
  });
  assert.equal(gov.baseUrl, "https://api.gov-dooray.com");
  assert.equal(isUnset(""), true);
});

test("DoorayClient sends dooray-api Authorization and query params", async () => {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    calls.push({ url: String(input), init: init ?? {} });
    return new Response(
      JSON.stringify({
        header: { isSuccessful: true, resultCode: 0, resultMessage: "Success" },
        result: [{ id: "1" }],
        totalCount: 1,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  const client = new DoorayClient({
    token: "test-token",
    baseUrl: "https://api.dooray.com",
    fetchImpl,
  });

  const payload = await client.request({
    method: "GET",
    path: "/project/v1/projects",
    query: { member: "me", size: 20, type: undefined },
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.url, "https://api.dooray.com/project/v1/projects?member=me&size=20");
  const headers = calls[0]?.init.headers as Record<string, string>;
  assert.equal(headers.Authorization, "dooray-api test-token");
  assert.deepEqual((payload as { totalCount: number }).totalCount, 1);
});

test("DoorayClient maps header.resultMessage on HTTP errors", async () => {
  const fetchImpl: typeof fetch = async () =>
    new Response(
      JSON.stringify({
        header: { isSuccessful: false, resultCode: -300101, resultMessage: "CHANNEL_ALREADY_EXISTS_ERROR" },
      }),
      { status: 409, headers: { "Content-Type": "application/json" } },
    );

  const client = new DoorayClient({
    token: "test-token",
    baseUrl: "https://api.dooray.com",
    fetchImpl,
  });

  await assert.rejects(
    () =>
      client.request({
        method: "POST",
        path: "/messenger/v1/channels?idType=member-id",
        body: { title: "x", memberIds: ["1"] },
      }),
    (error: unknown) => {
      assert.ok(error instanceof DoorayApiError);
      assert.equal(error.status, 409);
      assert.equal(error.resultCode, -300101);
      assert.match(error.message, /CHANNEL_ALREADY_EXISTS_ERROR/);
      return true;
    },
  );
});

test("DoorayClient posts JSON create-post body from the official spec", async () => {
  let rawBody = "";
  const fetchImpl: typeof fetch = async (_input, init) => {
    rawBody = String(init?.body ?? "");
    return new Response(JSON.stringify({ header: { isSuccessful: true, resultCode: 0 }, result: { id: "99" } }), {
      status: 200,
    });
  };
  const client = new DoorayClient({ token: "t", baseUrl: "https://api.dooray.com", fetchImpl });
  await client.request({
    method: "POST",
    path: "/project/v1/projects/1/posts",
    body: {
      subject: "제목을 입력합니다.",
      body: { mimeType: "text/x-markdown", content: "본문" },
      users: { to: [{ type: "member", member: { organizationMemberId: "1" } }] },
      dueDateFlag: true,
      priority: "normal",
    },
  });
  const parsed = JSON.parse(rawBody) as { dueDateFlag: boolean; users: { to: unknown[] } };
  assert.equal(parsed.dueDateFlag, true);
  assert.equal(parsed.users.to.length, 1);
});
