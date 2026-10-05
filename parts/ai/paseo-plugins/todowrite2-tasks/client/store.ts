import { useSyncExternalStore } from "react";
import type { Todo } from "./todos.ts";

const EMPTY: Todo[] = [];
const lists = new Map<string, Todo[]>();
const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setAgentTodos(agentId: string, todos: Todo[]) {
  lists.set(agentId, todos);
  notify();
}

export function clearAgentTodos(agentId: string) {
  if (lists.delete(agentId)) notify();
}

export function useAgentTodos(agentId: string): Todo[] {
  return useSyncExternalStore(subscribe, () => lists.get(agentId) ?? EMPTY);
}
