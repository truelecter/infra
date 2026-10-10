import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createItem,
  deleteItem,
  emptyData,
  listItems,
  setDescriptionOpen,
  updateItem,
  type BacklogData,
} from "./store.ts";

const T0 = "2026-09-30T10:00:00.000Z";
const T1 = "2026-09-30T11:00:00.000Z";
const T2 = "2026-09-30T12:00:00.000Z";

function withItems(...titles: string[]): BacklogData {
  return titles.reduce(
    (data, title) => createItem(data, { title }, T0).data,
    emptyData(),
  );
}

test("ids keep counting after a delete, so an old id never names a new item", () => {
  const data = deleteItem(withItems("a", "b"), 2).data;
  const { result } = createItem(data, { title: "c" }, T1);
  assert.equal(result.id, 3);
});

test("a new item starts open, with its source agent on the first history entry", () => {
  const { result } = createItem(
    emptyData(),
    { title: "MR !42 fixes login", agentId: "agent-1" },
    T0,
  );
  assert.equal(result.status, "open");
  assert.deepEqual(result.log, [
    { at: T0, status: "open", agentId: "agent-1" },
  ]);
});

test("a status check logs its text and the status move with the checking agent", () => {
  const { result } = updateItem(
    withItems("MR"),
    1,
    { status: "done", log: "merged", agentId: "checker" },
    T1,
  );
  assert.equal(result.status, "done");
  assert.deepEqual(result.log.at(-1), {
    at: T1,
    text: "merged",
    status: "done",
    agentId: "checker",
  });
  assert.equal(result.updatedAt, T1);
});

test("setting the current status again adds no history entry", () => {
  const { result } = updateItem(withItems("MR"), 1, { status: "open" }, T1);
  assert.equal(result.log.length, 1);
});

test("an empty description clears it, an omitted one keeps it", () => {
  const data = createItem(
    emptyData(),
    { title: "MR", description: "See [!42](https://x)" },
    T0,
  ).data;
  assert.equal(
    updateItem(data, 1, { log: "checked" }, T1).result.description,
    "See [!42](https://x)",
  );
  assert.equal(
    updateItem(data, 1, { description: "" }, T1).result.description,
    "",
  );
});

test("unfolding a description leaves the item and its place in the list alone", () => {
  const data = withItems("a", "b");
  const opened = setDescriptionOpen(data, 1, true).data;
  assert.deepEqual(opened.openIds, [1]);
  assert.deepEqual(opened.items, data.items);
  assert.deepEqual(setDescriptionOpen(opened, 1, false).data.openIds, []);
  assert.deepEqual(deleteItem(opened, 1).data.openIds, []);
  assert.throws(() => setDescriptionOpen(data, 7, true), { code: "not_found" });
});

test("an update with only an agent id is rejected as empty", () => {
  assert.throws(
    () => updateItem(withItems("MR"), 1, { agentId: "x" }, T1),
    /Nothing to change/,
  );
});

test("unknown ids report not_found", () => {
  assert.throws(() => updateItem(emptyData(), 7, { log: "x" }, T1), {
    code: "not_found",
  });
  assert.throws(() => deleteItem(emptyData(), 7), { code: "not_found" });
});

test("list orders open, waiting, done, newest update first, and filters by status", () => {
  let data = withItems("old open", "waiting", "done", "new open");
  data = updateItem(data, 2, { status: "waiting" }, T1).data;
  data = updateItem(data, 3, { status: "done" }, T1).data;
  data = updateItem(data, 4, { description: "touched" }, T2).data;
  assert.deepEqual(
    listItems(data).map((item) => item.title),
    ["new open", "old open", "waiting", "done"],
  );
  assert.deepEqual(
    listItems(data, ["waiting", "done"]).map((item) => item.id),
    [2, 3],
  );
});
