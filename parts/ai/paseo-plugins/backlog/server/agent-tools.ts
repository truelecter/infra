import {
  defineAgentTool,
  type AgentToolDefinition,
} from "@getpaseo/plugin/server";
import { z } from "zod";
import {
  changesSchema,
  createInputSchema,
  statusSchema,
  type Item,
  type LogEntry,
} from "../shared/backlog.ts";
import type { FileStore } from "./file-store.ts";
import {
  createItem,
  deleteItem,
  findItem,
  listItems,
  updateItem,
} from "./store.ts";

const idSchema = z.number().int().positive().describe("Item id, as in #12");
const agentIdSchema = createInputSchema.shape.agentId.describe(
  "Another Paseo agent to record instead of the calling one; omit to record yourself",
);

/** `2026-09-30 14:05Z`, the CLI's format. */
function when(iso: string): string {
  return `${iso.slice(0, 16).replace("T", " ")}Z`;
}

function entry(log: LogEntry): string {
  return [
    when(log.at),
    log.status,
    log.text,
    log.agentId ? `by agent ${log.agentId}` : undefined,
  ]
    .filter(Boolean)
    .join("  ");
}

function head(item: Item): string {
  return `#${item.id} [${item.status}] ${item.title}`;
}

/** One item in full, the description verbatim so it can be edited and passed back. */
export function formatItem(item: Item): string {
  return [
    head(item),
    item.agentId ? `from agent: ${item.agentId}` : undefined,
    item.cwd ? `cwd: ${item.cwd}` : undefined,
    `created ${when(item.createdAt)}, updated ${when(item.updatedAt)}`,
    item.description ? `description:\n${item.description}` : undefined,
    "history:",
    ...[...item.log].reverse().map((log) => `  ${entry(log)}`),
  ]
    .filter((line) => line !== undefined)
    .join("\n");
}

export function formatList(items: Item[]): string {
  if (!items.length) return "No items.";
  return items
    .flatMap((item) => [
      head(item),
      ...(item.description
        ? item.description.split("\n").map((line) => `    ${line}`)
        : []),
      ...(item.agentId ? [`    from agent: ${item.agentId}`] : []),
      `    last: ${entry(item.log[item.log.length - 1])}`,
    ])
    .join("\n");
}

/**
 * The `backlog` CLI's operations as agent tools. They run the same validation and store
 * functions as the socket API (`http.ts`) and record the calling agent the way the CLI does
 * (`$PASEO_AGENT_ID`, `$PASEO_AGENT_CWD`).
 */
export function backlogTools(store: FileStore): AgentToolDefinition[] {
  return [
    defineAgentTool({
      name: "backlog_add",
      description:
        "Add an item to the user's Paseo backlog (follow-ups such as an MR that should fix an issue, a bug, an idea). Records you as the chat it came from, and your working directory.",
      input: z.strictObject({
        title: createInputSchema.shape.title.describe("Short title"),
        description: createInputSchema.shape.description.describe(
          "Markdown; put links to MRs, issues, and docs here, and task lists for steps left",
        ),
        status: statusSchema
          .optional()
          .describe("open (default), waiting (on someone else), or done"),
        agentId: agentIdSchema,
      }),
      async execute(input, { agent }) {
        const create = createInputSchema.parse({
          ...input,
          agentId: input.agentId ?? agent.id,
          cwd: agent.cwd,
        });
        const item = await store.mutate((data, now) =>
          createItem(data, create, now),
        );
        return { text: formatItem(item), structuredContent: item };
      },
    }),
    defineAgentTool({
      name: "backlog_list",
      description:
        "List backlog items in status order, most recently updated first.",
      input: z.strictObject({
        status: z
          .array(statusSchema)
          .optional()
          .describe(
            'Statuses to show; omit for open and waiting, ["open","waiting","done"] for all',
          ),
      }),
      async execute({ status }) {
        const items = listItems(
          await store.read(),
          status?.length ? status : ["open", "waiting"],
        );
        return { text: formatList(items), structuredContent: { items } };
      },
    }),
    defineAgentTool({
      name: "backlog_show",
      description: "Show one backlog item with its full history.",
      input: z.strictObject({ id: idSchema }),
      async execute({ id }) {
        const item = findItem(await store.read(), id);
        return { text: formatItem(item), structuredContent: item };
      },
    }),
    defineAgentTool({
      name: "backlog_update",
      description:
        "Change a backlog item and/or add a history line. Log every status check, even when nothing changed. description replaces the old one.",
      input: changesSchema.extend({
        id: idSchema,
        title: changesSchema.shape.title.describe("New title"),
        description: changesSchema.shape.description.describe(
          "New Markdown description; replaces the whole old one",
        ),
        status: changesSchema.shape.status.describe("open, waiting, or done"),
        log: changesSchema.shape.log.describe(
          "History line, for example the result of a status check",
        ),
        agentId: agentIdSchema,
      }),
      async execute({ id, ...changes }, { agent }) {
        const parsed = changesSchema.parse({
          ...changes,
          agentId: changes.agentId ?? agent.id,
        });
        const item = await store.mutate((data, now) =>
          updateItem(data, id, parsed, now),
        );
        return { text: formatItem(item), structuredContent: item };
      },
    }),
    defineAgentTool({
      name: "backlog_remove",
      description:
        "Delete a backlog item. Only when the user asks; mark finished work done instead.",
      input: z.strictObject({ id: idSchema }),
      async execute({ id }) {
        const item = await store.mutate((data) => deleteItem(data, id));
        return {
          text: `Deleted #${item.id} ${item.title}`,
          structuredContent: item,
        };
      },
    }),
  ];
}
