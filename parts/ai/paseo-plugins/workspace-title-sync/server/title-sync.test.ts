import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PARENT_AGENT_ID_LABEL,
  soleAgentWorkspace,
  TitleSync,
  type AgentInfo,
} from "./title-sync.ts";

function agent(id: string, fields: Partial<AgentInfo> = {}): AgentInfo {
  return {
    id,
    workspaceId: "wks_a",
    title: null,
    labels: {},
    archivedAt: null,
    ...fields,
  };
}

test("sole top-level agent owns its workspace despite subagents and archived agents", () => {
  const agents = [
    agent("self"),
    agent("sub", { labels: { [PARENT_AGENT_ID_LABEL]: "self" } }),
    agent("gone", { archivedAt: "2026-09-30T00:00:00.000Z" }),
    agent("elsewhere", { workspaceId: "wks_b" }),
  ];
  assert.equal(soleAgentWorkspace(agents, "self"), "wks_a");
});

test("a second top-level agent keeps the workspace title", () => {
  assert.equal(
    soleAgentWorkspace([agent("self"), agent("other")], "self"),
    null,
  );
});

test("a subagent never owns the workspace", () => {
  const sub = agent("self", { labels: { [PARENT_AGENT_ID_LABEL]: "other" } });
  assert.equal(soleAgentWorkspace([sub], "self"), null);
  assert.equal(soleAgentWorkspace([agent("other"), sub], "self"), null);
});

test("no workspace for an unknown agent or one outside any workspace", () => {
  assert.equal(soleAgentWorkspace([agent("other")], "self"), null);
  assert.equal(
    soleAgentWorkspace([agent("self", { workspaceId: undefined })], "self"),
    null,
  );
});

function seeded(...agents: AgentInfo[]): TitleSync {
  const sync = new TitleSync();
  sync.beginSnapshot();
  sync.addSnapshot(agents);
  assert.deepEqual(sync.endSnapshot(), []);
  return sync;
}

test("the first snapshot renames nothing, so a user-set workspace title survives a reload", () => {
  const sync = seeded(agent("a", { title: "Title" }));
  assert.equal(sync.upsert(agent("a", { title: "Title" })), null);
});

test("a retitle renames the workspace once", () => {
  const sync = seeded(agent("a", { title: "First prompt text" }));
  assert.deepEqual(sync.upsert(agent("a", { title: "Fix login bug" })), {
    agentId: "a",
    workspaceId: "wks_a",
    title: "Fix login bug",
  });
  assert.equal(sync.upsert(agent("a", { title: "Fix login bug" })), null);
});

test("a new agent's first title is a baseline, its next one a rename", () => {
  const sync = seeded();
  assert.equal(sync.upsert(agent("a", { title: "Created" })), null);
  assert.equal(
    sync.upsert(agent("a", { title: "Retitled" }))?.title,
    "Retitled",
  );
});

test("a retitle with a second top-level agent, or of a subagent, renames nothing", () => {
  const sub = { labels: { [PARENT_AGENT_ID_LABEL]: "a" } };
  const sync = seeded(
    agent("a", { title: "A" }),
    agent("b", { title: "B" }),
    agent("s", { title: "S", workspaceId: "wks_b", ...sub }),
  );
  assert.equal(sync.upsert(agent("a", { title: "A2" })), null);
  assert.equal(
    sync.upsert(agent("s", { title: "S2", workspaceId: "wks_b", ...sub })),
    null,
  );
  sync.remove("b");
  assert.equal(sync.upsert(agent("a", { title: "A3" }))?.title, "A3");
});

test("a cleared title is not a rename", () => {
  const sync = seeded(agent("a", { title: "Title" }));
  assert.equal(sync.upsert(agent("a", { title: null })), null);
});

test("a reconnect snapshot applies a retitle missed while disconnected", () => {
  const sync = seeded(
    agent("a", { title: "Old" }),
    agent("x", { title: "X", workspaceId: "wks_x" }),
  );
  sync.beginSnapshot();
  sync.addSnapshot([agent("a", { title: "New" })]);
  sync.addSnapshot([agent("x", { title: "X", workspaceId: "wks_x" })]);
  assert.deepEqual(sync.endSnapshot(), [
    { agentId: "a", workspaceId: "wks_a", title: "New" },
  ]);
});

test("renames wait for the whole snapshot, where a later page can hold a sibling", () => {
  const sync = seeded(agent("a", { title: "Old" }));
  sync.beginSnapshot();
  sync.addSnapshot([agent("a", { title: "Old" })]);
  assert.equal(sync.upsert(agent("a", { title: "New" })), null);
  // The page read after the update is older than it and doesn't override it.
  sync.addSnapshot([agent("a", { title: "Old" }), agent("b", { title: "B" })]);
  assert.deepEqual(sync.endSnapshot(), []);
});
