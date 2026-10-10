import type { ToolCallDetail } from "@getpaseo/protocol/agent-types";

export type ToolKind =
  | "shell"
  | "read"
  | "edit"
  | "write"
  | "search"
  | "task"
  | "mcp"
  | "paseo"
  | "ask"
  | "other";

export type CountBucket =
  | "commands"
  | "files read"
  | "files edited"
  | "searches"
  | "tools";

export interface ToolCallInput {
  name: string;
  detail: ToolCallDetail;
}

export interface ToolDescription {
  kind: ToolKind;
  /** Lucide icon name, drawn through the host's icon set. */
  icon: string;
  label: string;
  /** One line of the call's arguments, or empty. */
  preview: string;
  countBucket: CountBucket;
  /** What the row shows when opened: output, content, or diff. */
  detailText: string;
  /** Highlight hint for `detailText`, when it is code. */
  detailLanguage?: string;
}

/** Paseo's agent-management tools, which OMP exposes under their bare names. */
const PASEO_TOOLS: Record<string, true> = {
  create_agent: true,
  list_agents: true,
  get_agent_status: true,
  get_agent_activity: true,
  send_agent_prompt: true,
  wait_for_agent: true,
  cancel_agent: true,
  kill_agent: true,
  archive_agent: true,
  update_agent: true,
  list_providers: true,
  list_models: true,
  list_workspaces: true,
  create_workspace: true,
  list_schedules: true,
  create_schedule: true,
  delete_schedule: true,
};

const SHELL_NAMES: Record<string, true> = {
  bash: true,
  shell: true,
  exec: true,
  exec_command: true,
  run_command: true,
};

const SEARCH_NAMES: Record<string, true> = {
  search: true,
  grep: true,
  glob: true,
  find: true,
  web_search: true,
  ast_grep: true,
};

const KIND_ICONS: Record<ToolKind, string> = {
  shell: "Terminal",
  read: "FileText",
  edit: "FilePen",
  write: "FilePlus",
  search: "Search",
  task: "Bot",
  mcp: "Plug",
  paseo: "Users",
  ask: "MessageCircleQuestion",
  other: "Wrench",
};

const KIND_BUCKETS: Record<ToolKind, CountBucket> = {
  shell: "commands",
  read: "files read",
  edit: "files edited",
  write: "files edited",
  search: "searches",
  task: "tools",
  mcp: "tools",
  paseo: "tools",
  ask: "tools",
  other: "tools",
};

/** Keeps the store small: an opened row never needs a whole file. */
const MAX_DETAIL_CHARS = 8000;
const MAX_PREVIEW_CHARS = 140;

function kindOf(name: string, detail: ToolCallDetail): ToolKind {
  const lower = name.toLowerCase();
  if (lower === "ask" || lower === "ask_user") return "ask";
  if (lower.startsWith("mcp__")) return "mcp";
  if (PASEO_TOOLS[lower] === true) return "paseo";
  switch (detail.type) {
    case "shell":
      return "shell";
    case "read":
      return "read";
    case "edit":
      return "edit";
    case "write":
      return "write";
    case "search":
      return "search";
    case "sub_agent":
      return "task";
    default:
      break;
  }
  if (SHELL_NAMES[lower] === true) return "shell";
  if (SEARCH_NAMES[lower] === true) return "search";
  if (
    lower === "read" ||
    lower === "edit" ||
    lower === "write" ||
    lower === "task"
  )
    return lower;
  return "other";
}

/** `create_agent` -> `Create agent`. */
export function humanizeToolName(name: string): string {
  const words = name.replace(/[_-]+/g, " ").trim();
  return words ? words[0]!.toUpperCase() + words.slice(1) : name;
}

function labelOf(kind: ToolKind, name: string, detail: ToolCallDetail): string {
  switch (kind) {
    case "shell":
      return "Shell Command";
    case "read":
      return "Read";
    case "edit":
      return "Edit";
    case "write":
      return "Write File";
    case "search":
      return detail.type === "search" && detail.toolName === "web_search"
        ? "Web Search"
        : "Search";
    case "task":
      return detail.type === "sub_agent" && detail.subAgentType
        ? humanizeToolName(detail.subAgentType)
        : "Task";
    case "mcp": {
      // `mcp__server__tool`; a tool name may itself contain `__`.
      const tool = name.split("__").slice(2).join("__");
      return tool || name;
    }
    case "paseo":
      return humanizeToolName(name);
    case "ask":
      return "Ask";
    default:
      return name;
  }
}

function firstLine(text: string | undefined): string {
  if (!text) return "";
  const line = text.trim().split("\n")[0]!.trim();
  return line.length > MAX_PREVIEW_CHARS
    ? `${line.slice(0, MAX_PREVIEW_CHARS - 3)}...`
    : line;
}

function previewOf(detail: ToolCallDetail): string {
  switch (detail.type) {
    case "shell":
      return firstLine(detail.command);
    case "read":
    case "edit":
    case "write":
      return firstLine(detail.filePath);
    case "search":
      return firstLine(detail.query);
    case "fetch":
      return firstLine(detail.url);
    case "plain_text":
      return firstLine(detail.label);
    case "sub_agent":
      return firstLine(detail.description);
    default:
      return "";
  }
}

function stringify(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function detailOf(detail: ToolCallDetail): { text: string; language?: string } {
  switch (detail.type) {
    case "shell": {
      const output = detail.output?.replace(/\s+$/, "") ?? "";
      return {
        text: output ? `$ ${detail.command}\n${output}` : `$ ${detail.command}`,
        language: "bash",
      };
    }
    case "read":
      return { text: detail.content ?? "" };
    case "edit":
      return detail.unifiedDiff
        ? { text: detail.unifiedDiff, language: "diff" }
        : { text: detail.newString ?? "" };
    case "write":
      return { text: detail.content ?? "" };
    case "search": {
      if (detail.content) return { text: detail.content };
      if (detail.webResults?.length) {
        return {
          text: detail.webResults
            .map((r) => `${r.title}\n${r.url}`)
            .join("\n\n"),
        };
      }
      return { text: detail.filePaths?.join("\n") ?? "" };
    }
    case "fetch":
      return { text: detail.result ?? "" };
    case "plain_text":
      return { text: detail.text ?? "" };
    case "plan":
      return { text: detail.text };
    case "sub_agent":
      return {
        text: [detail.description, detail.log].filter(Boolean).join("\n\n"),
      };
    case "worktree_setup":
      return { text: detail.log };
    case "unknown": {
      const input = stringify(detail.input);
      const output = stringify(detail.output);
      return {
        text: [input, output].filter(Boolean).join("\n\n"),
        language: "json",
      };
    }
  }
}

/** Reads what a compact activity row needs out of an OMP tool call. */
export function describeTool(item: ToolCallInput): ToolDescription {
  const kind = kindOf(item.name, item.detail);
  const lower = item.name.toLowerCase();
  const detail = detailOf(item.detail);
  const text =
    detail.text.length > MAX_DETAIL_CHARS
      ? `${detail.text.slice(0, MAX_DETAIL_CHARS)}\n...`
      : detail.text;
  return {
    kind,
    icon:
      lower === "think" || lower === "thinking" ? "Brain" : KIND_ICONS[kind],
    label: labelOf(kind, item.name, item.detail),
    preview: previewOf(item.detail),
    countBucket: KIND_BUCKETS[kind],
    detailText: text,
    ...(detail.language ? { detailLanguage: detail.language } : {}),
  };
}

const BUCKET_PHRASES: Array<{
  bucket: CountBucket;
  verb: string;
  one: string;
  many: string;
}> = [
  { bucket: "commands", verb: "Ran", one: "command", many: "commands" },
  { bucket: "files read", verb: "Read", one: "file", many: "files" },
  { bucket: "files edited", verb: "Edited", one: "file", many: "files" },
  { bucket: "searches", verb: "Ran", one: "search", many: "searches" },
];

/**
 * The folded line for a run of tools, such as
 * `Ran 2 commands · Read 2 files · Edited 1 file · Used 5 tools`. A bucket
 * with no calls is left out; the total is always there.
 */
export function summarizeActivity(buckets: readonly CountBucket[]): string {
  const parts: string[] = [];
  for (const { bucket, verb, one, many } of BUCKET_PHRASES) {
    const count = buckets.filter((b) => b === bucket).length;
    if (count > 0) parts.push(`${verb} ${count} ${count === 1 ? one : many}`);
  }
  parts.push(
    `Used ${buckets.length} ${buckets.length === 1 ? "tool" : "tools"}`,
  );
  return parts.join(" · ");
}
