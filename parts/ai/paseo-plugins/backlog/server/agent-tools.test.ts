import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AgentToolContext } from "@getpaseo/plugin/server";
import { z } from "zod";
import { itemSchema } from "../shared/backlog.ts";
import { backlogTools } from "./agent-tools.ts";
import { FileStore } from "./file-store.ts";

let dir: string;
let store: FileStore;

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "backlog-tools-"));
  store = new FileStore(join(dir, "items.json"));
});

after(() => rm(dir, { recursive: true, force: true }));

const context = {
  agent: {
    id: "agent-1",
    workspaceId: null,
    parentAgentId: null,
    provider: "omp",
    cwd: "/projects/shop",
    title: null,
  },
  // The tools never use the SDK.
  paseo: {} as AgentToolContext["paseo"],
  signal: new AbortController().signal,
} satisfies AgentToolContext;

/** Calls a tool the way Paseo does: input parsed by the tool's schema first. */
async function call(name: string, input: unknown) {
  const tool = backlogTools(store).find((entry) => entry.name === name);
  assert.ok(tool, name);
  return tool.execute(tool.input.parse(input), context);
}

const itemList = z.object({ items: z.array(itemSchema) });

async function callItem(name: string, input: unknown) {
  const result = await call(name, input);
  return {
    text: result.text ?? "",
    item: itemSchema.parse(result.structuredContent),
  };
}

async function callList(input: unknown) {
  const result = await call("backlog_list", input);
  return {
    text: result.text ?? "",
    items: itemList.parse(result.structuredContent).items,
  };
}

test("add records the calling agent and its cwd, update records it on the history entry", async () => {
  const added = await callItem("backlog_add", {
    title: "  MR !1 fixes it ",
    description: "[!1](https://example.com/1)",
    status: "waiting",
  });
  const item = added.item;
  assert.equal(item.title, "MR !1 fixes it");
  assert.equal(item.agentId, "agent-1");
  assert.equal(item.cwd, "/projects/shop");
  assert.match(added.text, /^#\d+ \[waiting\] MR !1 fixes it\n/);
  assert.match(added.text, /description:\n\[!1\]\(https:\/\/example.com\/1\)/);

  const { item: changed } = await callItem("backlog_update", {
    id: item.id,
    status: "done",
    log: "Merged",
    agentId: "agent-2",
  });
  assert.equal(changed.status, "done");
  assert.equal(changed.log.at(-1)?.agentId, "agent-2");
  assert.equal(changed.agentId, "agent-1");

  const checked = await callItem("backlog_update", {
    id: item.id,
    log: "Still done",
  });
  assert.equal(checked.item.log.at(-1)?.agentId, "agent-1");

  const shown = await callItem("backlog_show", { id: item.id });
  assert.match(shown.text, /Still done  by agent agent-1/);
});

test("list defaults to open and waiting, and takes statuses", async () => {
  const { item: open } = await callItem("backlog_add", { title: "Open one" });
  const active = await callList({});
  assert.ok(active.items.some((item) => item.id === open.id));
  assert.ok(active.items.every((item) => item.status !== "done"));
  const done = await callList({ status: ["done"] });
  assert.ok(done.items.length > 0);
  assert.ok(done.items.every((item) => item.status === "done"));
  assert.match(done.text, /\[done\]/);
});

test("validation matches the socket API", async () => {
  const add = backlogTools(store).find((tool) => tool.name === "backlog_add");
  assert.ok(add);
  assert.throws(() => add.input.parse({ title: "  " }));
  assert.throws(() => add.input.parse({ title: "x", cwd: "/elsewhere" }));
  const { item } = await callItem("backlog_add", { title: "To change" });
  await assert.rejects(
    call("backlog_update", { id: item.id }),
    /Nothing to change/,
  );
  await assert.rejects(
    call("backlog_show", { id: 9999 }),
    /No backlog item #9999/,
  );
  const removed = await callItem("backlog_remove", { id: item.id });
  assert.equal(removed.text, `Deleted #${item.id} To change`);
  await assert.rejects(
    call("backlog_remove", { id: item.id }),
    /No backlog item/,
  );
});
