import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { withoutDenied } from "./filter.ts";

describe("withoutDenied", () => {
  it("drops tools with a deny policy and keeps the order", () => {
    assert.deepEqual(
      withoutDenied(["read", "mcp__tracker_search_logs", "bash", "mcp__tracker_get_issue"], {
        mcp__tracker_search_logs: "deny",
        mcp__tracker_add_comment: "prompt",
        bash: "prompt",
      }),
      ["read", "bash", "mcp__tracker_get_issue"],
    );
  });

  it("returns null when no active tool is denied", () => {
    assert.equal(withoutDenied(["read", "bash"], { bash: "prompt", mcp__x: "deny" }), null);
    assert.equal(withoutDenied([], {}), null);
  });
});
