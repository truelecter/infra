import { completedTodos, latestTodos, type Todo } from "./todos.ts";

const PAGE_SIZE = 200;
const MAX_PAGES = 10;

interface TimelineCursor {
  epoch: string;
  seq: number;
}

interface TimelinePage {
  entries: readonly { item: unknown }[];
  hasOlder: boolean;
  startCursor: TimelineCursor | null;
}

interface TimelineRefetchOptions {
  direction: "tail" | "before";
  cursor?: TimelineCursor;
  limit: number;
  projection: "projected";
}

interface TimelineUpdate {
  event: { type: string; item?: unknown };
}

interface TimelineSubscription {
  (): void;
  readonly ready: Promise<void>;
}

// The slice of the SDK agent timeline handle this module uses.
export interface TimelineSource {
  refetch(options: TimelineRefetchOptions): Promise<TimelinePage>;
  subscribe(handler: (update: TimelineUpdate) => void): TimelineSubscription;
}

// Reports the agent's latest saved task list: first from history, then live.
// A live update always wins over a history scan that is still in flight.
export function followTodos(
  timeline: TimelineSource,
  onChange: (todos: Todo[]) => void,
  onError: (error: unknown) => void,
): () => void {
  let stopped = false;
  let scan = 0;

  async function scanHistory() {
    const current = ++scan;
    let cursor: TimelineCursor | undefined;
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const result = await timeline.refetch({
        direction: cursor ? "before" : "tail",
        ...(cursor ? { cursor } : {}),
        limit: PAGE_SIZE,
        projection: "projected",
      });
      if (stopped || current !== scan) return;
      const todos = latestTodos(result.entries.map((entry) => entry.item));
      if (todos) {
        onChange(todos);
        return;
      }
      if (!result.hasOlder || !result.startCursor) break;
      cursor = result.startCursor;
    }
    onChange([]);
  }

  function rescan() {
    scanHistory().catch((error: unknown) => {
      if (!stopped) onError(error);
    });
  }

  const subscription = timeline.subscribe(({ event }) => {
    if (stopped) return;
    if (
      event.type === "replacement" ||
      event.type === "subscription_restored"
    ) {
      rescan();
      return;
    }
    if (event.type !== "timeline") return;
    const todos = completedTodos(event.item);
    if (!todos) return;
    scan += 1;
    onChange(todos);
  });
  subscription.ready.then(rescan, (error: unknown) => {
    if (!stopped) onError(error);
  });

  return () => {
    stopped = true;
    subscription();
  };
}
