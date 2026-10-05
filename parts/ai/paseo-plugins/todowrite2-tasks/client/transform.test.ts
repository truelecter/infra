import assert from "node:assert/strict";
import { test } from "node:test";
import { transformTodoToolCall } from "./transform.ts";

const todos = [{ content: "Build", status: "in_progress", priority: "high" }];
const list = [{ content: "Build", status: "in_progress" }];

type Input = Parameters<typeof transformTodoToolCall>[0];

function run(status: string, input: unknown, name = "todowrite2") {
  const item = {
    type: "tool_call",
    callId: "c",
    name,
    status,
    error: null,
    detail: { type: "unknown", input, output: null },
  } as unknown as Input["item"];
  return transformTodoToolCall({ item, phase: status === "running" ? "streaming" : "complete" });
}

const card = {
  items: [{ type: "plugin", kind: "todowrite2-task-list", version: 1, data: { todos: list } }],
};

test("draws a task list card for running and completed calls", () => {
  assert.deepEqual(run("running", JSON.stringify({ todos })), card);
  assert.deepEqual(run("running", { todos }), card);
  assert.deepEqual(run("completed", { todos }), card);
});

test("hides a running call until its input is a complete list", () => {
  assert.deepEqual(run("running", ""), { items: [] });
  assert.deepEqual(run("running", '{"todos": ['), { items: [] });
});

test("keeps Paseo's own row for failed, cancelled, unreadable and other calls", () => {
  assert.equal(run("failed", { todos }), undefined);
  assert.equal(run("canceled", { todos }), undefined);
  assert.equal(run("completed", { nope: true }), undefined);
  assert.equal(run("completed", { todos }, "bash"), undefined);
});
