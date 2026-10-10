import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  activityView,
  createActivityStore,
  type ActivityView,
  type ToolEntry,
} from "./activity-store";

const tool = (callId: string, status = "completed"): ToolEntry => ({
  callId,
  name: "bash",
  kind: "shell",
  icon: "Terminal",
  label: "Shell Command",
  preview: `echo ${callId}`,
  status,
  countBucket: "commands",
  detailText: "",
});

const sync = () => createActivityStore({ schedule: (flush) => flush() });

describe("activity store", () => {
  it("folds a turn without reasoning: the first call anchors the rest", () => {
    const store = sync();
    const first = store.recordTool(tool("a"));
    const second = store.recordTool(tool("b"));
    assert.equal(first.isAnchor, true);
    assert.equal(first.hasThinking, false);
    assert.equal(second.isAnchor, false);
    assert.equal(second.runId, first.runId);
    assert.deepEqual(
      store.getRun(first.runId)?.tools.map((t) => t.callId),
      ["a", "b"],
    );
  });

  it("ungroups the tools of a turn that had reasoning first", () => {
    const store = sync();
    store.noteThinking();
    const first = store.recordTool(tool("a"));
    const second = store.recordTool(tool("b"));
    assert.equal(first.hasThinking, true);
    assert.equal(second.hasThinking, true);
  });

  it("starts a new run at a boundary and forgets the turn's reasoning", () => {
    const store = sync();
    store.noteThinking();
    const before = store.recordTool(tool("a"));
    store.noteBoundary();
    const after = store.recordTool(tool("b"));
    assert.notEqual(after.runId, before.runId);
    assert.equal(after.isAnchor, true);
    assert.equal(after.hasThinking, false);
  });

  it("closes a folded run when reasoning follows it, so later calls draw solo", () => {
    const store = sync();
    const folded = store.recordTool(tool("a"));
    store.noteThinking();
    const later = store.recordTool(tool("b"));
    assert.notEqual(later.runId, folded.runId);
    assert.equal(later.hasThinking, true);
    assert.equal(store.getRun(folded.runId)?.tools.length, 1);
  });

  it("updates a known call in place and keeps its first decision", () => {
    const store = sync();
    const first = store.recordTool(tool("a", "running"));
    store.recordTool(tool("b"));
    store.noteBoundary();
    const update = store.recordTool(tool("a", "completed"));
    assert.deepEqual(update, first);
    assert.equal(store.getEntry(first.runId, "a")?.status, "completed");
    assert.equal(store.getRun(first.runId)?.tools.length, 2);
  });

  it("notifies subscribers once per scheduled flush", () => {
    const pending: Array<() => void> = [];
    const store = createActivityStore({
      schedule: (flush) => pending.push(flush),
    });
    let calls = 0;
    store.subscribe(() => {
      calls += 1;
    });
    store.recordTool(tool("a"));
    store.recordTool(tool("b"));
    assert.equal(calls, 0);
    assert.equal(pending.length, 1);
    pending[0]!();
    assert.equal(calls, 1);
  });

  it("drops the oldest runs past the limit", () => {
    const store = createActivityStore({
      runLimit: 2,
      schedule: (flush) => flush(),
    });
    const first = store.recordTool(tool("a"));
    store.noteBoundary();
    store.recordTool(tool("b"));
    store.noteBoundary();
    store.recordTool(tool("c"));
    assert.equal(store.getRun(first.runId), undefined);
    // The evicted call is new again: it opens a run of its own.
    store.noteBoundary();
    assert.notEqual(store.recordTool(tool("a")).runId, first.runId);
  });
});

describe("activityView", () => {
  const drawn = (view: ActivityView) =>
    view.kind === "none"
      ? "none"
      : view.kind === "row"
        ? `row:${view.entry.callId}`
        : `summary:${view.tools.map((t) => t.callId).join(",")}`;

  const foldedRun = () => {
    const store = sync();
    const { runId } = store.recordTool(tool("a"));
    store.recordTool(tool("b"));
    store.recordTool(tool("c"));
    return { runId, run: store.getRun(runId) };
  };

  it("draws the summary on the anchor and nothing on members while combining", () => {
    const { runId, run } = foldedRun();
    assert.equal(
      drawn(activityView({ mode: "group", runId }, run, true)),
      "summary:a,b,c",
    );
    assert.equal(
      drawn(activityView({ mode: "member", runId, callId: "b" }, run, true)),
      "none",
    );
  });

  it("draws every call of a folded run as its own row with combining off", () => {
    const { runId, run } = foldedRun();
    assert.deepEqual(
      [
        activityView({ mode: "group", runId }, run, false),
        activityView({ mode: "member", runId, callId: "b" }, run, false),
        activityView({ mode: "member", runId, callId: "c" }, run, false),
      ].map(drawn),
      ["row:a", "row:b", "row:c"],
    );
  });

  it("draws a lone call as a row, not a summary", () => {
    const store = sync();
    const { runId } = store.recordTool(tool("a"));
    assert.equal(
      drawn(activityView({ mode: "group", runId }, store.getRun(runId), true)),
      "row:a",
    );
  });

  it("draws solo calls as rows whatever the setting", () => {
    const store = sync();
    store.noteThinking();
    const { runId } = store.recordTool(tool("a"));
    const run = store.getRun(runId);
    for (const combine of [true, false]) {
      assert.equal(
        drawn(activityView({ mode: "solo", runId, callId: "a" }, run, combine)),
        "row:a",
      );
    }
  });

  it("draws nothing for a run or call the store no longer has", () => {
    const { runId, run } = foldedRun();
    assert.equal(
      drawn(activityView({ mode: "group", runId: 999 }, undefined, false)),
      "none",
    );
    assert.equal(
      drawn(activityView({ mode: "member", runId, callId: "x" }, run, false)),
      "none",
    );
  });
});
