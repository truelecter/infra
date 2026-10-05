import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PARENT_AGENT_ID_LABEL,
  soleAgentWorkspace,
  TitleTracker,
  type AgentInfo,
} from "./title-sync.ts";

function agent(id: string, fields: Partial<AgentInfo> = {}): AgentInfo {
  return { id, workspaceId: "wks_a", title: null, labels: {}, archivedAt: null, ...fields };
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
  assert.equal(soleAgentWorkspace([agent("self"), agent("other")], "self"), null);
});

test("a subagent never owns the workspace", () => {
  const sub = agent("self", { labels: { [PARENT_AGENT_ID_LABEL]: "other" } });
  assert.equal(soleAgentWorkspace([sub], "self"), null);
  assert.equal(soleAgentWorkspace([agent("other"), sub], "self"), null);
});

test("no workspace for an unknown agent or one outside any workspace", () => {
  assert.equal(soleAgentWorkspace([agent("other")], "self"), null);
  assert.equal(soleAgentWorkspace([agent("self", { workspaceId: undefined })], "self"), null);
});

test("a retitle during a turn is reported once", () => {
  const titles = new TitleTracker();
  titles.started("a", "First prompt text");
  assert.equal(titles.ended("a", "Fix login bug"), "Fix login bug");
  titles.started("a", "Fix login bug");
  assert.equal(titles.ended("a", "Fix login bug"), null);
});

test("a retitle between turns is reported at the next turn end", () => {
  const titles = new TitleTracker();
  titles.started("a", "Old");
  assert.equal(titles.ended("a", "Old"), null);
  titles.started("a", "Renamed in the UI");
  assert.equal(titles.ended("a", "Renamed in the UI"), "Renamed in the UI");
});

test("no baseline means no change, so a user-set workspace title survives a reload", () => {
  const titles = new TitleTracker();
  assert.equal(titles.ended("a", "Title"), null);
  assert.equal(titles.ended("a", "Title"), null);
});

test("a cleared title is not a rename, and forget drops the baseline", () => {
  const titles = new TitleTracker();
  titles.started("a", "Title");
  assert.equal(titles.ended("a", null), null);
  titles.forget("a");
  assert.equal(titles.ended("a", "Other"), null);
});
