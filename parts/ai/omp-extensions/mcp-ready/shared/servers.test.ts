import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { enabledServers, missingServers, toolPrefix } from "./servers.ts";

describe("enabledServers", () => {
  it("lists servers that are not disabled", () => {
    assert.deepEqual(
      enabledServers({ mcpServers: { tracker: { command: "x" }, old: { command: "y", enabled: false }, web: { url: "u" } } }),
      ["tracker", "web"],
    );
  });

  it("returns nothing for missing or malformed configs", () => {
    assert.deepEqual(enabledServers(undefined), []);
    assert.deepEqual(enabledServers({ mcpServers: "nope" }), []);
    assert.deepEqual(enabledServers({}), []);
  });
});

describe("toolPrefix", () => {
  it("builds OMP's mcp__<server>_ prefix", () => {
    assert.equal(toolPrefix("tracker"), "mcp__tracker_");
    assert.equal(toolPrefix("My-Server"), "mcp__my_server_");
  });
});

describe("missingServers", () => {
  it("reports servers without any enabled tool", () => {
    const tools = ["read", "mcp__tracker_get_issue", "bash"];
    assert.deepEqual(missingServers(["tracker", "web"], tools), ["web"]);
    assert.deepEqual(missingServers(["tracker"], tools), []);
    assert.deepEqual(missingServers([], tools), []);
  });
});
