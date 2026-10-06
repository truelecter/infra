import type { CountBucket, ToolKind } from "./tool-kind";

/**
 * Groups a turn's tool calls so the first one can draw a folded summary for
 * all of them.
 *
 * A timeline transformer sees only the item and its phase, not the agent or
 * the row time, so the grouping is decided at transform time from the order
 * the host feeds items in, in one global store. Two panes streaming at once
 * can interleave their items and merge two turns into one run; that is rare
 * and accepted.
 *
 * A run is one stretch of tool calls between boundaries (a user prompt or an
 * assistant reply). A run that started with no reasoning before it is folded:
 * its first call is the anchor that draws the summary and the rest draw
 * nothing while combining is on. Reasoning in the turn ungroups the tools that
 * follow it: each draws its own row. Reasoning that arrives after a folded run
 * has started closes that run, so the calls after it draw on their own instead
 * of joining a summary that sits above the reasoning.
 *
 * Every call of a folded run still gets its own timeline item, so turning the
 * Combine tool calls setting off redraws each one as a row in place, with no
 * need for the host to transform the items again.
 */

export interface ToolEntry {
  callId: string;
  name: string;
  kind: ToolKind;
  icon: string;
  label: string;
  preview: string;
  status: string;
  countBucket: CountBucket;
  detailText: string;
  detailLanguage?: string;
}

export interface Run {
  id: number;
  tools: ToolEntry[];
  /** True when reasoning came before the run's first call: tools draw solo. */
  hasThinking: boolean;
  /** Bumped on every change, so a subscriber can tell the run moved. */
  version: number;
}

export interface RecordResult {
  runId: number;
  isAnchor: boolean;
  hasThinking: boolean;
}

/**
 * What a tool call's timeline item carries. `group` is a folded run's anchor
 * (always the run's first call), `member` is any later call of that run, and
 * `solo` is a call of a turn that had reasoning.
 */
export type ActivityPayload =
  | { mode: "group"; runId: number }
  | { mode: "member"; runId: number; callId: string }
  | { mode: "solo"; runId: number; callId: string };

export type ActivityView =
  | { kind: "none" }
  | { kind: "row"; entry: ToolEntry }
  | { kind: "summary"; tools: ToolEntry[] };

/**
 * What one activity item draws. With `combine` off every call draws its own
 * row, the anchor as the run's first call; with it on, the anchor draws the
 * summary (a lone call needs none) and members draw nothing.
 */
export function activityView(
  payload: ActivityPayload,
  run: Run | undefined,
  combine: boolean,
): ActivityView {
  const tools = run?.tools ?? [];
  if (payload.mode === "group") {
    const first = tools[0];
    if (!first) return { kind: "none" };
    if (!combine || tools.length === 1) return { kind: "row", entry: first };
    return { kind: "summary", tools };
  }
  if (payload.mode === "member" && combine) return { kind: "none" };
  const entry = tools.find((tool) => tool.callId === payload.callId);
  return entry ? { kind: "row", entry } : { kind: "none" };
}

export interface ActivityStore {
  noteBoundary(): void;
  noteThinking(): void;
  recordTool(entry: ToolEntry): RecordResult;
  getRun(id: number): Run | undefined;
  getEntry(runId: number, callId: string): ToolEntry | undefined;
  subscribe(listener: () => void): () => void;
}

/** History reloads replay every item; this bounds what the replays keep. */
const DEFAULT_RUN_LIMIT = 200;

export function createActivityStore(
  options: { runLimit?: number; schedule?: (flush: () => void) => void } = {},
): ActivityStore {
  const runLimit = options.runLimit ?? DEFAULT_RUN_LIMIT;
  // Transforms run while the host renders, so listeners fire on a later tick
  // instead of updating other components mid-render.
  const schedule = options.schedule ?? queueMicrotask;
  const runs = new Map<number, Run>();
  const runByCall = new Map<string, number>();
  const listeners = new Set<() => void>();
  let nextId = 1;
  let currentId: number | null = null;
  let turnHasThinking = false;
  let flushPending = false;

  function publish(): void {
    if (flushPending) return;
    flushPending = true;
    schedule(() => {
      flushPending = false;
      for (const listener of listeners) listener();
    });
  }

  function evict(): void {
    while (runs.size > runLimit) {
      const oldest = runs.keys().next().value;
      if (oldest === undefined) return;
      for (const tool of runs.get(oldest)?.tools ?? []) runByCall.delete(tool.callId);
      runs.delete(oldest);
      if (currentId === oldest) currentId = null;
    }
  }

  function openRun(): Run {
    const current = currentId === null ? undefined : runs.get(currentId);
    if (current) return current;
    const run: Run = { id: nextId++, tools: [], hasThinking: turnHasThinking, version: 0 };
    runs.set(run.id, run);
    currentId = run.id;
    evict();
    return run;
  }

  function resultFor(run: Run, callId: string): RecordResult {
    return {
      runId: run.id,
      isAnchor: run.tools[0]?.callId === callId,
      hasThinking: run.hasThinking,
    };
  }

  return {
    noteBoundary() {
      currentId = null;
      turnHasThinking = false;
    },

    noteThinking() {
      turnHasThinking = true;
      const current = currentId === null ? undefined : runs.get(currentId);
      if (!current) return;
      if (current.tools.length === 0) {
        current.hasThinking = true;
      } else if (!current.hasThinking) {
        // A folded run is already on screen above this reasoning.
        currentId = null;
      }
    },

    recordTool(entry) {
      // A call already seen (a status update, or a history replay) stays in
      // the run it was first filed under, whatever has happened since.
      const knownRunId = runByCall.get(entry.callId);
      const known = knownRunId === undefined ? undefined : runs.get(knownRunId);
      if (known) {
        const index = known.tools.findIndex((tool) => tool.callId === entry.callId);
        if (index >= 0) known.tools[index] = entry;
        known.version += 1;
        publish();
        return resultFor(known, entry.callId);
      }
      const run = openRun();
      run.tools.push(entry);
      run.version += 1;
      runByCall.set(entry.callId, run.id);
      publish();
      return resultFor(run, entry.callId);
    },

    getRun(id) {
      return runs.get(id);
    },

    getEntry(runId, callId) {
      return runs.get(runId)?.tools.find((tool) => tool.callId === callId);
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export const activityStore = createActivityStore();
