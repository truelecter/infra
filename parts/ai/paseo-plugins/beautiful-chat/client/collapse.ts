import type { ToolCallKind } from "../shared/contracts";

/**
 * The kinds of card the two collapse settings can pick. "Collapse while
 * running" keeps a picked kind closed while its call is still running, so a
 * long streaming output does not push the chat around. "Collapse finished
 * calls" closes a picked kind once its call finishes. A failed call always
 * opens, and a card opened or closed by hand keeps that state.
 */
export const COLLAPSE_GROUPS = [
  { id: "reasoning", label: "Reasoning" },
  { id: "shell", label: "Shell" },
  { id: "files", label: "Files" },
  { id: "agents", label: "Agents" },
  { id: "eval", label: "Eval" },
  { id: "mcp", label: "MCP" },
  { id: "ask", label: "Ask" },
  { id: "other", label: "Other tools" },
] as const;

export type CollapseGroup = (typeof COLLAPSE_GROUPS)[number]["id"];

/** Which kinds a collapse setting picks: true collapses that kind. */
export type CollapseKinds = Record<CollapseGroup, boolean>;

/**
 * Everything stays closed except reasoning, which is the part worth reading
 * as it streams and rereading afterwards. Both settings share this default.
 */
export const DEFAULT_COLLAPSE_KINDS: Readonly<CollapseKinds> = {
  reasoning: false,
  shell: true,
  files: true,
  agents: true,
  eval: true,
  mcp: true,
  ask: true,
  other: true,
};

export type CardState = "running" | "finished" | "failed";

/** Whether a card of `group` in `state` opens on its own. */
export function isCardExpanded(
  group: CollapseGroup,
  state: CardState,
  settings: { collapseRunning: CollapseKinds; collapseFinished: CollapseKinds },
): boolean {
  if (state === "failed") return true;
  const collapse = state === "running" ? settings.collapseRunning : settings.collapseFinished;
  return !collapse[group];
}

/**
 * The group a tool call belongs to. The renderer falls back to the `bash`
 * kind for any tool it has no card for, so `bash` counts as a shell only when
 * the call is named `bash`; every other fallback is "other".
 */
export function collapseGroupForTool(tool: ToolCallKind, rawName: string): CollapseGroup {
  switch (tool) {
    case "thinking":
      return "reasoning";
    case "shell":
    case "git":
      return "shell";
    case "bash":
      return rawName === "bash" ? "shell" : "other";
    case "read":
    case "write":
    case "edit":
      return "files";
    case "task":
    case "hub":
    case "paseo":
      return "agents";
    case "eval":
      return "eval";
    case "mcp":
      return "mcp";
    case "ask":
      return "ask";
    default:
      return "other";
  }
}

/** Reads a stored map; a missing or malformed entry takes its default. */
export function parseCollapseKinds(value: unknown): CollapseKinds {
  const parsed: CollapseKinds = { ...DEFAULT_COLLAPSE_KINDS };
  if (!value || typeof value !== "object") return parsed;
  for (const { id } of COLLAPSE_GROUPS) {
    const entry: unknown = Reflect.get(value, id);
    if (typeof entry === "boolean") parsed[id] = entry;
  }
  return parsed;
}
