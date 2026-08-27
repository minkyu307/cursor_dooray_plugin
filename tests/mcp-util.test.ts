import assert from "node:assert/strict";
import test from "node:test";
import { compactQuery, toMemberUsers } from "../src/mcp-util.ts";

test("compactQuery drops empty values", () => {
  assert.deepEqual(compactQuery({ a: "1", b: undefined, c: "", d: 0, e: false }), {
    a: "1",
    d: 0,
    e: false,
  });
});

test("toMemberUsers maps organizationMemberId per official post body", () => {
  assert.deepEqual(toMemberUsers(["10"], ["20"]), {
    to: [{ type: "member", member: { organizationMemberId: "10" } }],
    cc: [{ type: "member", member: { organizationMemberId: "20" } }],
  });
  assert.equal(toMemberUsers([], []), undefined);
});
