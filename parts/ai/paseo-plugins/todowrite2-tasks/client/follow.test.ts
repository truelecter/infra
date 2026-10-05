import assert from "node:assert/strict";
import { test } from "node:test";
import { followTodos, type TimelineSource } from "./follow.ts";
import type { Todo } from "./todos.ts";

type Page = Awaited<ReturnType<TimelineSource["refetch"]>>;
type Handler = Parameters<TimelineSource["subscribe"]>[0];

function saved(content: string) {
  return {
    item: {
      type: "tool_call",
      name: "todowrite2",
      status: "completed",
      detail: { type: "unknown", input: { todos: [{ content, status: "pending" }] } },
    },
  };
}

const other = { item: { type: "assistant_message", text: "hi" } };

function fakeTimeline(pages: Page[]) {
  const requests: Parameters<TimelineSource["refetch"]>[0][] = [];
  let handler: Handler = () => {};
  let released = false;
  let respond: ((page: Page) => void) | null = null;
  const source: TimelineSource = {
    refetch(options) {
      requests.push(options);
      const page = pages.shift();
      if (page) return Promise.resolve(page);
      return new Promise((resolve) => {
        respond = resolve;
      });
    },
    subscribe(next) {
      handler = next;
      return Object.assign(
        () => {
          released = true;
        },
        { ready: Promise.resolve() },
      );
    },
  };
  return {
    source,
    requests,
    emit: (event: Parameters<Handler>[0]["event"]) => handler({ event }),
    respond: (page: Page) => respond?.(page),
    released: () => released,
  };
}

function page(entries: Page["entries"], hasOlder: boolean): Page {
  return { entries, hasOlder, startCursor: hasOlder ? { epoch: "e", seq: 1 } : null };
}

async function settle() {
  for (let index = 0; index < 5; index += 1) await new Promise((resolve) => setImmediate(resolve));
}

function fail(error: unknown) {
  assert.fail(String(error));
}

function contents(lists: Todo[][]) {
  return lists.map((todos) => todos.map((todo) => todo.content));
}

test("pages back through history until it finds the last saved list", async () => {
  const timeline = fakeTimeline([page([other], true), page([saved("Old"), other], false)]);
  const lists: Todo[][] = [];
  followTodos(timeline.source, (todos) => lists.push(todos), fail);
  await settle();
  assert.deepEqual(contents(lists), [["Old"]]);
  assert.deepEqual(
    timeline.requests.map((request) => request.direction),
    ["tail", "before"],
  );
});

test("reports an empty list when history has none", async () => {
  const timeline = fakeTimeline([page([other], false)]);
  const lists: Todo[][] = [];
  followTodos(timeline.source, (todos) => lists.push(todos), fail);
  await settle();
  assert.deepEqual(lists, [[]]);
});

test("a live list wins over a history scan still in flight", async () => {
  const timeline = fakeTimeline([]);
  const lists: Todo[][] = [];
  followTodos(timeline.source, (todos) => lists.push(todos), fail);
  await settle();
  timeline.emit({ type: "timeline", item: saved("Live").item });
  timeline.respond(page([saved("Old")], false));
  await settle();
  assert.deepEqual(contents(lists), [["Live"]]);
});

test("rescans after a replacement and stops on cleanup", async () => {
  const timeline = fakeTimeline([page([saved("First")], false), page([saved("Second")], false)]);
  const lists: Todo[][] = [];
  const stop = followTodos(timeline.source, (todos) => lists.push(todos), fail);
  await settle();
  timeline.emit({ type: "replacement" });
  await settle();
  stop();
  timeline.emit({ type: "timeline", item: saved("After").item });
  assert.deepEqual(contents(lists), [["First"], ["Second"]]);
  assert.equal(timeline.released(), true);
});
