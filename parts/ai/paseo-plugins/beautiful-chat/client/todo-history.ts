import { useEffect, useRef, useSyncExternalStore } from "react";

/**
 * What changed between two snapshots of an agent's todo list.
 *
 * The host diffs each new snapshot against the last one and files one
 * `todo_list` row per change (created, added, started, completed), but the
 * plugin projection hands a transformer only `{type: "todo", items}`, so the
 * change itself never reaches plugin code. Each row carries the whole list.
 * Drawing that list in full for every row buried the chat under copies of the
 * same checklist, so the card shows what changed and keeps the list folded.
 * The change is worked out again here, against the snapshot drawn before it.
 */

export type TodoStatus = "completed" | "in_progress" | "pending";

export interface TodoTask {
  /** Identity across snapshots: the task id, else its text and occurrence. */
  key: string;
  text: string;
  status: TodoStatus;
}

export type TodoChangeType = "completed" | "started" | "added";

export interface TodoChange {
  type: TodoChangeType;
  tasks: string[];
}

function statusOf(item: Record<string, unknown>): TodoStatus {
  if (item.completed === true || item.status === "completed") return "completed";
  return item.status === "in_progress" ? "in_progress" : "pending";
}

/**
 * Reads the host's task entries. OMP sends no ids, and the host matches by
 * position, so inserting a task reads to it as every later task being new.
 * Matching by text, counted per repeat, survives an insert.
 */
export function normalizeTodoTasks(items: readonly Record<string, unknown>[]): TodoTask[] {
  const seen = new Map<string, number>();
  return items.map((item) => {
    const text = typeof item.text === "string" ? item.text : "Untitled task";
    const occurrence = seen.get(text) ?? 0;
    seen.set(text, occurrence + 1);
    const key =
      typeof item.id === "string" && item.id.length > 0 ? `id:${item.id}` : `${occurrence}:${text}`;
    return { key, text, status: statusOf(item) };
  });
}

const CHANGE_ORDER: readonly TodoChangeType[] = ["completed", "started", "added"];

/**
 * The changes from `previous` to `current`, grouped by kind: tasks that
 * finished, tasks that started, and tasks that are new. A task going back to
 * pending (blocked, reopened) or leaving the list is not a change the host
 * files a row for, so it is not one here either.
 */
export function deriveTodoChanges(
  previous: readonly TodoTask[],
  current: readonly TodoTask[],
): TodoChange[] {
  const before = new Map(previous.map((task) => [task.key, task.status]));
  const grouped = new Map<TodoChangeType, string[]>();
  const push = (type: TodoChangeType, text: string) => {
    const tasks = grouped.get(type);
    if (tasks) tasks.push(text);
    else grouped.set(type, [text]);
  };
  for (const task of current) {
    const prior = before.get(task.key);
    if (prior === undefined) push("added", task.text);
    else if (prior !== task.status && task.status === "completed") push("completed", task.text);
    else if (prior !== task.status && task.status === "in_progress") push("started", task.text);
  }
  return CHANGE_ORDER.flatMap((type) => {
    const tasks = grouped.get(type);
    return tasks ? [{ type, tasks }] : [];
  });
}

/**
 * One todo call that completes a task and starts the next makes the host file
 * two rows carrying the same list, one after the other. The transformer meets
 * them back to back in one projection pass, so a list equal to the one just
 * before it in the same pass is a sibling and is dropped. The memory clears at
 * the next microtask: a later pass, such as a remounted chat re-projecting
 * from the top, starts fresh and keeps its first row.
 */
export function createSiblingFilter(
  schedule: (reset: () => void) => void = queueMicrotask,
): (key: string) => boolean {
  let last: string | null = null;
  let pending = false;
  return (key) => {
    const repeat = key === last;
    last = key;
    if (!pending) {
      pending = true;
      schedule(() => {
        last = null;
        pending = false;
      });
    }
    return repeat;
  };
}

/**
 * Every snapshot drawn so far, per agent, keyed by row time. A renderer knows
 * only its own row, so each one records its list here and reads the latest
 * list from before its own time to find what it changed. Entries stay after a
 * row scrolls out of view, so the rows below it keep their changes.
 */
export class TodoHistory {
  private readonly agents = new Map<string, Map<number, readonly TodoTask[]>>();
  private readonly listeners = new Set<() => void>();

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  record(agentId: string, at: number, tasks: readonly TodoTask[]): void {
    let snapshots = this.agents.get(agentId);
    if (!snapshots) {
      snapshots = new Map();
      this.agents.set(agentId, snapshots);
    }
    if (snapshots.get(at) === tasks) return;
    snapshots.set(at, tasks);
    this.publish();
  }

  /** Drops a row's earlier entry once the host has moved that row to a later time. */
  forget(agentId: string, at: number): void {
    if (this.agents.get(agentId)?.delete(at)) this.publish();
  }

  /** The latest list recorded before `at`, or null when none has been drawn. */
  previous(agentId: string, at: number): readonly TodoTask[] | null {
    const snapshots = this.agents.get(agentId);
    if (!snapshots) return null;
    let bestAt = -Infinity;
    let best: readonly TodoTask[] | null = null;
    for (const [time, tasks] of snapshots) {
      if (time < at && time > bestAt) {
        bestAt = time;
        best = tasks;
      }
    }
    return best;
  }

  private publish(): void {
    for (const listener of this.listeners) listener();
  }
}

const history = new TodoHistory();

/**
 * Records this row's list and returns what it changed since the list drawn
 * before it, or null when there is none to compare with: the agent's first
 * list, or one whose predecessor has not been loaded yet.
 *
 * The host updates its last row in place, with a new time, when a call
 * changes nothing it files a row for (a task blocked, say). The row then
 * drops its entry under the old time, or it would compare against itself.
 */
export function useTodoChanges(
  agentId: string,
  at: number,
  tasks: readonly TodoTask[],
): TodoChange[] | null {
  const recorded = useRef<{ agentId: string; at: number } | null>(null);
  useEffect(() => {
    history.record(agentId, at, tasks);
    const earlier = recorded.current;
    if (earlier && (earlier.agentId !== agentId || earlier.at !== at)) {
      history.forget(earlier.agentId, earlier.at);
    }
    recorded.current = { agentId, at };
  }, [agentId, at, tasks]);

  const getPrevious = () => history.previous(agentId, at);
  const previous = useSyncExternalStore(history.subscribe, getPrevious, getPrevious);
  return previous ? deriveTodoChanges(previous, tasks) : null;
}
