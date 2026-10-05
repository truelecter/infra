import assert from "node:assert/strict";
import { test } from "node:test";
import { completedTodos, latestTodos, readTodos, todoProgress, type Todo } from "./todos.ts";

const todos = [
  { content: "Plan", status: "completed", priority: "high" },
  { content: "Build", status: "in_progress", priority: "high" },
  { content: "Drop", status: "cancelled", priority: "low" },
  { content: "Ship", status: "pending", priority: "low" },
];

const list: Todo[] = [
  { content: "Plan", status: "completed" },
  { content: "Build", status: "in_progress" },
  { content: "Drop", status: "cancelled" },
  { content: "Ship", status: "pending" },
];

function call(status: string, input: unknown, name = "todowrite2") {
  return { type: "tool_call", callId: "c", name, status, detail: { type: "unknown", input, output: null } };
}

test("reads a list from an object or from streamed JSON text", () => {
  assert.deepEqual(readTodos({ todos }), list);
  assert.deepEqual(readTodos(JSON.stringify({ todos })), list);
  assert.equal(readTodos(""), null);
  assert.equal(readTodos('{"todos": [{"content": "Pl'), null);
  assert.equal(readTodos({ todos: [{ content: "x", status: "blocked" }] }), null);
});

test("only a completed todowrite2 call counts as the saved list", () => {
  assert.deepEqual(completedTodos(call("completed", { todos })), list);
  assert.equal(completedTodos(call("running", { todos })), null);
  assert.equal(completedTodos(call("failed", { todos })), null);
  assert.equal(completedTodos(call("completed", { todos }, "todowrite")), null);
  assert.equal(completedTodos({ type: "assistant_message", text: "hi" }), null);
});

test("picks the newest completed list", () => {
  const older = { todos: [{ content: "Old", status: "pending" }] };
  const newer = { todos: [{ content: "New", status: "in_progress" }] };
  assert.deepEqual(
    latestTodos([call("completed", older), call("completed", newer), call("running", older)]),
    [{ content: "New", status: "in_progress" }],
  );
  assert.equal(latestTodos([call("running", newer)]), null);
});

test("progress leaves cancelled tasks out of both counts", () => {
  assert.deepEqual(todoProgress(list), { completed: 1, total: 3 });
});
