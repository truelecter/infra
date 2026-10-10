import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { request } from "node:http";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import { itemSchema } from "../shared/backlog.ts";
import { FileStore } from "./file-store.ts";
import { createBacklogServer, listen } from "./http.ts";

let dir: string;
let socketPath: string;
let stop: () => Promise<void>;

before(async () => {
  dir = await mkdtemp(join(tmpdir(), "backlog-"));
  socketPath = join(dir, "backlog.sock");
  stop = await listen(
    createBacklogServer(new FileStore(join(dir, "items.json"))),
    socketPath,
  );
});

after(async () => {
  await stop();
  await rm(dir, { recursive: true, force: true });
});

const itemList = z.object({ items: z.array(itemSchema) });
const failure = z.object({ error: z.string() });

async function call(method: string, path: string, body?: unknown) {
  const { promise, resolve, reject } = Promise.withResolvers<{
    status: number;
    json: unknown;
  }>();
  const req = request({
    socketPath,
    method,
    path,
    headers: { "content-type": "application/json" },
  });
  req.on("error", reject);
  req.on("response", async (response) => {
    let text = "";
    for await (const chunk of response) text += chunk;
    resolve({ status: response.statusCode ?? 0, json: JSON.parse(text) });
  });
  req.end(
    typeof body === "string"
      ? body
      : body === undefined
        ? undefined
        : JSON.stringify(body),
  );
  return promise;
}

test("concurrent creates get distinct ids and all land in the file", async () => {
  const created = await Promise.all(
    ["a", "b", "c", "d"].map((title) => call("POST", "/items", { title })),
  );
  assert.deepEqual(
    created.map((r) => r.status),
    [201, 201, 201, 201],
  );
  assert.deepEqual(
    created.map((r) => itemSchema.parse(r.json).id).sort(),
    [1, 2, 3, 4],
  );
  const file = JSON.parse(await readFile(join(dir, "items.json"), "utf8"));
  assert.equal(file.items.length, 4);
});

test("patch, filtered list, and delete round-trip over the socket", async () => {
  const patched = await call("PATCH", "/items/2", {
    status: "waiting",
    log: "MR in review",
  });
  assert.equal(patched.status, 200);
  assert.equal(itemSchema.parse(patched.json).status, "waiting");
  const waiting = await call("GET", "/items?status=waiting");
  assert.deepEqual(
    itemList.parse(waiting.json).items.map((item) => item.id),
    [2],
  );
  assert.equal((await call("DELETE", "/items/2")).status, 200);
  assert.equal((await call("GET", "/items/2")).status, 404);
});

test("bad requests come back as 400 with a message", async () => {
  const typo = await call("PATCH", "/items/1", { stauts: "done" });
  assert.equal(typo.status, 400);
  assert.match(failure.parse(typo.json).error, /stauts/);
  assert.equal((await call("POST", "/items", "{not json")).status, 400);
  assert.equal((await call("GET", "/items?status=closed")).status, 400);
});

test("a corrupt backlog file is reported and left untouched", async () => {
  const other = await mkdtemp(join(tmpdir(), "backlog-corrupt-"));
  const path = join(other, "items.json");
  await writeFile(path, '{"version":1,"items":"oops"}');
  const store = new FileStore(path);
  await assert.rejects(
    store.mutate((data) => ({ data, result: null })),
    /not a valid backlog file/,
  );
  assert.equal(await readFile(path, "utf8"), '{"version":1,"items":"oops"}');
  await rm(other, { recursive: true, force: true });
});
