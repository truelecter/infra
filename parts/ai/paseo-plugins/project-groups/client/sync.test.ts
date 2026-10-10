import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Assignments } from "./groups.ts";
import {
  createAssignmentSync,
  type SettingsRead,
  type SettingsWrite,
} from "./sync.ts";

function fakeDaemon(initial: Assignments) {
  let revision = 1;
  let values: Assignments = initial;
  const writes: string[] = [];
  return {
    writes,
    /** Someone else saves in between. */
    externalWrite(next: Assignments) {
      values = next;
      revision += 1;
    },
    async read(): Promise<SettingsRead> {
      return {
        status: "ready",
        revision: String(revision),
        values: { assignments: values },
      };
    },
    async write(
      rev: string,
      next: { assignments: Record<string, string> },
    ): Promise<SettingsWrite> {
      writes.push(rev);
      if (rev !== String(revision))
        return { status: "conflict", error: "stale" };
      values = next.assignments;
      revision += 1;
      return { status: "saved", revision: String(revision), values: next };
    },
    stored: () => values,
  };
}

function setup(initial: Assignments) {
  const daemon = fakeDaemon(initial);
  const seen: Assignments[] = [];
  const errors: unknown[] = [];
  const sync = createAssignmentSync({
    read: daemon.read,
    write: daemon.write,
    parse: (values) => (values as { assignments: Assignments }).assignments,
    onChange: (assignments) => seen.push(assignments),
    onError: (error) => errors.push(error),
  });
  return { daemon, sync, seen, errors };
}

describe("createAssignmentSync", () => {
  it("loads, shows a change at once, then saves it", async () => {
    const { daemon, sync, seen } = setup({ a: "x" });
    await sync.refresh();
    assert.deepEqual(seen.at(-1), { a: "x" });

    const saved = sync.update((current) => ({ ...current, b: "y" }));
    assert.deepEqual(seen.at(-1), { a: "x", b: "y" });
    await saved;
    assert.deepEqual(daemon.stored(), { a: "x", b: "y" });
    assert.deepEqual(sync.current(), { a: "x", b: "y" });
  });

  it("re-applies the change on top of a concurrent save", async () => {
    const { daemon, sync, errors } = setup({ a: "x" });
    await sync.refresh();
    daemon.externalWrite({ a: "x", other: "z" });

    await sync.update((current) => ({ ...current, b: "y" }));
    assert.deepEqual(errors, []);
    assert.deepEqual(daemon.stored(), { a: "x", other: "z", b: "y" });
    assert.deepEqual(sync.current(), { a: "x", other: "z", b: "y" });
    assert.deepEqual(daemon.writes, ["1", "2"]);
  });

  it("saves queued changes in order", async () => {
    const { daemon, sync } = setup({});
    await sync.refresh();
    const first = sync.update((current) => ({ ...current, a: "1" }));
    const second = sync.update((current) => ({ ...current, a: "2", b: "2" }));
    await Promise.all([first, second]);
    assert.deepEqual(daemon.stored(), { a: "2", b: "2" });
  });

  it("reverts to the stored values when saving fails", async () => {
    const { sync, seen, errors } = setup({ a: "x" });
    await sync.refresh();
    const failing = createAssignmentSync({
      read: async () => ({
        status: "ready",
        revision: "1",
        values: { assignments: { a: "x" } },
      }),
      write: async () => ({ status: "invalid", error: "nope" }),
      parse: (values) => (values as { assignments: Assignments }).assignments,
      onChange: (assignments) => seen.push(assignments),
      onError: (error) => errors.push(error),
    });
    await failing.refresh();
    await failing.update(() => ({ a: "broken" }));
    assert.equal(errors.length, 1);
    assert.deepEqual(failing.current(), { a: "x" });
    assert.deepEqual(sync.current(), { a: "x" });
  });

  it("does not let a refresh drop a change that is still saving", async () => {
    const { sync, seen } = setup({});
    await sync.refresh();
    const saving = sync.update(() => ({ a: "1" }));
    await sync.refresh();
    assert.deepEqual(seen.at(-1), { a: "1" });
    await saving;
    assert.deepEqual(sync.current(), { a: "1" });
  });
});
