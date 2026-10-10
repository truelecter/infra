import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";

export const STATUSES = ["open", "waiting", "done"] as const;
export const statusSchema = z.enum(STATUSES);
export type Status = z.infer<typeof statusSchema>;

const nonEmpty = z.string().trim().min(1);

/** One line of an item's history: a status check, a status change, or both. */
export const logEntrySchema = z.object({
  at: z.string(),
  text: z.string().optional(),
  /** The status the item moved to with this entry. */
  status: statusSchema.optional(),
  /** Paseo agent that wrote the entry. */
  agentId: z.string().optional(),
});
export type LogEntry = z.infer<typeof logEntrySchema>;

export const itemSchema = z.object({
  id: z.number().int().positive(),
  title: z.string(),
  /** Markdown. Links to MRs, issues, and docs go here. */
  description: z.string(),
  status: statusSchema,
  /** Paseo agent whose chat the item came from. */
  agentId: z.string().optional(),
  cwd: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  log: z.array(logEntrySchema),
});
export type Item = z.infer<typeof itemSchema>;

export const createInputSchema = z.strictObject({
  title: nonEmpty,
  description: z.string().trim().optional(),
  status: statusSchema.optional(),
  agentId: nonEmpty.optional(),
  cwd: nonEmpty.optional(),
});
export type CreateInput = z.infer<typeof createInputSchema>;

export const changesSchema = z.strictObject({
  title: nonEmpty.optional(),
  description: z.string().trim().optional(),
  status: statusSchema.optional(),
  /** Appended to the item's history, for example the result of a status check. */
  log: nonEmpty.optional(),
  /** Paseo agent making the change; recorded on the history entry. */
  agentId: nonEmpty.optional(),
});
export type Changes = z.infer<typeof changesSchema>;

export const listInputSchema = z.object({
  status: z.array(statusSchema).optional(),
});

export const itemListSchema = z.object({
  items: z.array(itemSchema),
  /** Items whose description the screen shows unfolded. */
  openIds: z.array(z.number().int().positive()),
});
export type ItemList = z.infer<typeof itemListSchema>;

export const listItems = defineRpc({
  name: "items.list",
  input: listInputSchema,
  output: itemListSchema,
});

export const createItem = defineRpc({
  name: "items.create",
  input: createInputSchema,
  output: itemSchema,
});

export const updateItem = defineRpc({
  name: "items.update",
  input: z.object({ id: z.number().int().positive(), changes: changesSchema }),
  output: itemSchema,
});

export const deleteItem = defineRpc({
  name: "items.delete",
  input: z.object({ id: z.number().int().positive() }),
  output: z.object({}),
});

/** Unfolds or folds an item's description on the screen. Not an edit: no history, no updatedAt. */
export const setDescriptionOpen = defineRpc({
  name: "items.set-description-open",
  input: z.object({ id: z.number().int().positive(), open: z.boolean() }),
  output: z.object({}),
});
