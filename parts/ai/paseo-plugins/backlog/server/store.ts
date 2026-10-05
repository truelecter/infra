import { z } from "zod";
import {
  itemSchema,
  STATUSES,
  type Changes,
  type CreateInput,
  type Item,
  type LogEntry,
  type Status,
} from "../shared/backlog.ts";

export const backlogDataSchema = z.object({
  version: z.literal(1),
  /** Next item id. Ids are never reused, so "#12" keeps meaning one thing after a delete. */
  nextId: z.number().int().positive(),
  items: z.array(itemSchema),
  /** Items whose description the screen shows unfolded; all others are folded. */
  openIds: z.array(z.number().int().positive()).default([]),
});
export type BacklogData = z.infer<typeof backlogDataSchema>;

export class BacklogError extends Error {
  constructor(
    message: string,
    readonly code: "not_found" | "invalid",
  ) {
    super(message);
    this.name = "BacklogError";
  }
}

export function emptyData(): BacklogData {
  return { version: 1, nextId: 1, items: [], openIds: [] };
}

export function createItem(
  data: BacklogData,
  input: CreateInput,
  now: string,
): { data: BacklogData; result: Item } {
  const status = input.status ?? "open";
  const item: Item = {
    id: data.nextId,
    title: input.title,
    description: input.description ?? "",
    status,
    ...(input.agentId ? { agentId: input.agentId } : {}),
    ...(input.cwd ? { cwd: input.cwd } : {}),
    createdAt: now,
    updatedAt: now,
    log: [{ at: now, status, ...(input.agentId ? { agentId: input.agentId } : {}) }],
  };
  return { data: { ...data, nextId: data.nextId + 1, items: [...data.items, item] }, result: item };
}

export function findItem(data: BacklogData, id: number): Item {
  const item = data.items.find((entry) => entry.id === id);
  if (!item) throw new BacklogError(`No backlog item #${id}`, "not_found");
  return item;
}

export function updateItem(
  data: BacklogData,
  id: number,
  changes: Changes,
  now: string,
): { data: BacklogData; result: Item } {
  const current = findItem(data, id);
  const { agentId, ...edits } = changes;
  if (Object.values(edits).every((value) => value === undefined)) {
    throw new BacklogError("Nothing to change", "invalid");
  }

  const statusChanged = changes.status !== undefined && changes.status !== current.status;
  const log: LogEntry[] =
    statusChanged || changes.log
      ? [
          ...current.log,
          {
            at: now,
            ...(changes.log ? { text: changes.log } : {}),
            ...(statusChanged ? { status: changes.status } : {}),
            ...(agentId ? { agentId } : {}),
          },
        ]
      : current.log;

  const item: Item = {
    ...current,
    title: changes.title ?? current.title,
    description: changes.description ?? current.description,
    status: changes.status ?? current.status,
    log,
    updatedAt: now,
  };
  return {
    data: { ...data, items: data.items.map((entry) => (entry.id === id ? item : entry)) },
    result: item,
  };
}

export function deleteItem(data: BacklogData, id: number): { data: BacklogData; result: Item } {
  const item = findItem(data, id);
  return {
    data: {
      ...data,
      items: data.items.filter((entry) => entry.id !== id),
      openIds: data.openIds.filter((entry) => entry !== id),
    },
    result: item,
  };
}

/** Folding is screen state, not an edit, so the item itself (history, updatedAt, order) stays as is. */
export function setDescriptionOpen(
  data: BacklogData,
  id: number,
  open: boolean,
): { data: BacklogData; result: null } {
  findItem(data, id);
  const others = data.openIds.filter((entry) => entry !== id);
  return { data: { ...data, openIds: open ? [...others, id] : others }, result: null };
}

/** Items in status order (open, waiting, done), most recently updated first within a status. */
export function listItems(data: BacklogData, statuses?: readonly Status[]): Item[] {
  const wanted = new Set(statuses?.length ? statuses : STATUSES);
  return data.items
    .filter((item) => wanted.has(item.status))
    .sort(
      (a, b) =>
        STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status) ||
        b.updatedAt.localeCompare(a.updatedAt) ||
        b.id - a.id,
    );
}
