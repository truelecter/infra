// Keeps group assignments in the daemon's host-scoped plugin settings. Changes show at once and
// are then written with the last known revision; on a conflict the change is re-applied to the
// fresh values and retried.

import type { Assignments } from "./groups.ts";

export type SettingsRead =
  | { status: "ready"; revision: string; values: unknown }
  | { status: "invalid"; revision: string; error: string };

export type SettingsWrite =
  | { status: "saved"; revision: string; values: unknown }
  | { status: "conflict"; error: string }
  | { status: "invalid"; error: string };

export interface AssignmentSyncOptions {
  read(): Promise<SettingsRead>;
  write(revision: string, values: { assignments: Record<string, string> }): Promise<SettingsWrite>;
  parse(values: unknown): Assignments;
  onChange(assignments: Assignments): void;
  onError(error: unknown): void;
}

export type AssignmentChange = (assignments: Assignments) => Assignments;

export interface AssignmentSync {
  /** Re-read from the daemon. Skipped while a write is in flight. */
  refresh(): Promise<void>;
  update(change: AssignmentChange): Promise<void>;
  current(): Assignments;
}

const MAX_ATTEMPTS = 3;

export function createAssignmentSync(options: AssignmentSyncOptions): AssignmentSync {
  let revision: string | null = null;
  let stored: Assignments = {};
  let shown: Assignments = {};
  let pending = 0;
  let queue: Promise<void> = Promise.resolve();

  function show(next: Assignments) {
    shown = next;
    options.onChange(shown);
  }

  async function load() {
    const result = await options.read();
    revision = result.revision;
    stored = result.status === "ready" ? options.parse(result.values) : {};
  }

  async function persist(change: AssignmentChange) {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      if (revision === null) await load();
      const result = await options.write(revision ?? "", {
        assignments: { ...change(stored) },
      });
      if (result.status === "saved") {
        revision = result.revision;
        stored = options.parse(result.values);
        return;
      }
      if (result.status === "invalid") throw new Error(result.error);
      revision = null;
    }
    throw new Error("Group settings kept changing while saving");
  }

  return {
    async refresh() {
      if (pending > 0) return;
      try {
        await load();
        if (pending === 0) show(stored);
      } catch (error) {
        options.onError(error);
      }
    },
    update(change) {
      pending += 1;
      show(change(shown));
      queue = queue
        .then(() => persist(change))
        .catch((error: unknown) => {
          options.onError(error);
        })
        .finally(() => {
          pending -= 1;
          if (pending === 0) show(stored);
        });
      return queue;
    },
    current: () => shown,
  };
}
