import { useCallback, useSyncExternalStore } from "react";

/**
 * Which plugin timeline item is currently last.
 *
 * A running-jobs card belongs under the newest thing on screen, and a plugin
 * renderer knows only its own item — the host hands it no position. So each
 * item reports the moment it was first projected, and the highest moment wins.
 * Projection is cached per source item, so that moment is the item's arrival
 * time and does not move when the list re-renders or a row scrolls back in.
 */
interface Tail {
  key: string;
  at: number;
}

let tail: Tail | null = null;
const listeners = new Set<() => void>();

function publish(): void {
  for (const listener of listeners) listener();
}

/** Records an item's arrival. A later arrival takes the tail; ties keep the incumbent. */
export function noteTimelineItem(key: string, at: number): void {
  if (tail && (at < tail.at || (at === tail.at && key !== tail.key))) return;
  if (tail && tail.key === key && tail.at === at) return;
  tail = { key, at };
  publish();
}

export function getTimelineTail(): string | null {
  return tail?.key ?? null;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** True while this item is the newest one the plugin has drawn. */
export function useIsTimelineTail(key: string): boolean {
  const getSnapshot = useCallback(() => tail?.key === key, [key]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
