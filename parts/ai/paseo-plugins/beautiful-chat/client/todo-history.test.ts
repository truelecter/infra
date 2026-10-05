import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  TodoHistory,
  createSiblingFilter,
  deriveTodoChanges,
  normalizeTodoTasks,
} from "./todo-history";

const tasks = (...entries: Array<[string, string]>) =>
  normalizeTodoTasks(
    entries.map(([text, status]) => ({ text, status, completed: status === "completed" })),
  );

describe("deriveTodoChanges", () => {
  it("groups one call's changes: completed first, then started, then added", () => {
    const before = tasks(["Wave 4", "in_progress"], ["Wave 5", "pending"]);
    const after = tasks(["Wave 4", "completed"], ["Wave 5", "in_progress"], ["Gate", "pending"]);
    assert.deepEqual(deriveTodoChanges(before, after), [
      { type: "completed", tasks: ["Wave 4"] },
      { type: "started", tasks: ["Wave 5"] },
      { type: "added", tasks: ["Gate"] },
    ]);
  });

  it("collects several tasks of one kind into one change", () => {
    const before = tasks(["A", "in_progress"], ["B", "pending"], ["C", "pending"]);
    const after = tasks(["A", "completed"], ["B", "completed"], ["C", "pending"]);
    assert.deepEqual(deriveTodoChanges(before, after), [
      { type: "completed", tasks: ["A", "B"] },
    ]);
  });

  it("matches tasks by text, so an inserted task does not make the rest new", () => {
    const before = tasks(["A", "completed"], ["B", "pending"]);
    const after = tasks(["A", "completed"], ["New", "pending"], ["B", "pending"]);
    assert.deepEqual(deriveTodoChanges(before, after), [{ type: "added", tasks: ["New"] }]);
  });

  it("counts a task going back to pending or dropped from the list as no change", () => {
    const before = tasks(["A", "in_progress"], ["B", "completed"], ["C", "pending"]);
    const after = tasks(["A", "pending"], ["B", "completed"]);
    assert.deepEqual(deriveTodoChanges(before, after), []);
  });

  it("tells repeated task texts apart by occurrence", () => {
    const before = tasks(["Run suite", "completed"], ["Run suite", "pending"]);
    const after = tasks(["Run suite", "completed"], ["Run suite", "completed"]);
    assert.deepEqual(deriveTodoChanges(before, after), [
      { type: "completed", tasks: ["Run suite"] },
    ]);
  });

  it("prefers a task id over its text, so a rename is not a new task", () => {
    const before = normalizeTodoTasks([{ id: "1", text: "Old", status: "pending" }]);
    const after = normalizeTodoTasks([{ id: "1", text: "New", status: "in_progress" }]);
    assert.deepEqual(deriveTodoChanges(before, after), [{ type: "started", tasks: ["New"] }]);
  });
});

describe("createSiblingFilter", () => {
  it("drops a list equal to the one just before it in the same pass", () => {
    const resets: Array<() => void> = [];
    const isSibling = createSiblingFilter((reset) => resets.push(reset));
    assert.equal(isSibling("x"), false);
    assert.equal(isSibling("x"), true);
    assert.equal(isSibling("y"), false);
    assert.equal(isSibling("x"), false);
  });

  it("keeps the first row of a later pass even when it equals the last one seen", () => {
    const resets: Array<() => void> = [];
    const isSibling = createSiblingFilter((reset) => resets.push(reset));
    assert.equal(isSibling("x"), false);
    for (const reset of resets.splice(0)) reset();
    assert.equal(isSibling("x"), false);
    assert.equal(isSibling("x"), true);
  });
});

describe("TodoHistory", () => {
  const list = tasks(["A", "pending"]);
  const later = tasks(["A", "completed"]);

  it("returns the latest list from before a row's time, whatever order rows recorded in", () => {
    const history = new TodoHistory();
    history.record("agent", 300, later);
    history.record("agent", 100, list);
    history.record("agent", 200, later);
    assert.equal(history.previous("agent", 300), later);
    assert.equal(history.previous("agent", 200), list);
    assert.equal(history.previous("agent", 100), null);
  });

  it("keeps each agent's lists apart", () => {
    const history = new TodoHistory();
    history.record("a", 100, list);
    assert.equal(history.previous("b", 200), null);
  });

  it("stops comparing with a row's old time once that row moves", () => {
    const history = new TodoHistory();
    history.record("agent", 100, list);
    history.record("agent", 200, later);
    history.forget("agent", 200);
    history.record("agent", 250, later);
    assert.equal(history.previous("agent", 250), list);
  });

  it("tells subscribers about a new list, not about the same list again", () => {
    const history = new TodoHistory();
    let calls = 0;
    const unsubscribe = history.subscribe(() => calls++);
    history.record("agent", 100, list);
    history.record("agent", 100, list);
    history.forget("agent", 999);
    unsubscribe();
    history.record("agent", 200, list);
    assert.equal(calls, 1);
  });
});
