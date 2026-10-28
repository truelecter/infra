// Caveman modes: parsing, the mode in force at each user turn, and the text each turn gets.
// Pure functions; `index.ts` wires them into OMP's `context` event and the `/caveman` command.

export const MODES = ["off", "full", "high", "ultracave"] as const;
export type Mode = (typeof MODES)[number];
export type ActiveMode = Exclude<Mode, "off">;

/** Custom session entry `/caveman` appends: `{ mode, at }`, `at` in epoch ms. */
export const MODE_ENTRY = "caveman-mode";

const ALIASES: Record<string, Mode> = {
  off: "off",
  none: "off",
  nothing: "off",
  stop: "off",
  normal: "off",
  full: "full",
  caveman: "full",
  standard: "full",
  high: "high",
  ultra: "ultracave",
  ultracave: "ultracave",
};

/** A mode name or alias (`caveman`, `ultra`, `none`, ...), or undefined for anything else. */
export function parseMode(value: string | undefined): Mode | undefined {
  return ALIASES[value?.trim().toLowerCase() ?? ""];
}

// Per-turn reminders. Claude Opus 5.5 keeps its report style when the rules sit far back in the
// context; a short reminder on every user turn, which also limits answer scope, is what holds it.
export const REMINDERS: Record<ActiveMode, string> = {
  full:
    "<system-reminder>Caveman full reply. Scope: only what was asked. " +
    "After tool work: outcome first, then only what the user must know or do. " +
    'Cut: first-person narration ("I updated", "I also", "I didn\'t"), why-explanations nobody asked for, ' +
    "recaps, reassurance, offers. Articles optional, fragments fine, short words. Payload verbatim. " +
    "Full sentences for security, irreversible steps, questions to the user, a confused user.</system-reminder>",
  high:
    "<system-reminder>Caveman high reply. Scope: only what was asked; simple question, one or two lines. " +
    "After tool work: outcome first, then only what the user must know or do. " +
    'Cut: first-person narration ("I updated", "I also", "I didn\'t"), why-explanations nobody asked for, ' +
    "recaps, reassurance, offers. Fragments always, no articles, each fact once; keep because/so/then. " +
    "Payload verbatim. Full sentences only for security, irreversible steps, questions to the user, a confused user.</system-reminder>",
  ultracave:
    "<system-reminder>Ultracave reply. Scope: only what was asked; simple question, one line. " +
    "After tool work: outcome first, then only what the user must know or do. " +
    'Cut: first-person narration ("I updated", "I also", "I didn\'t"), why-explanations nobody asked for, ' +
    "recaps, reassurance, offers. Fragments, no articles, each fact once. Payload verbatim. " +
    "Full sentences only for security, irreversible steps, questions to the user, a confused user.</system-reminder>",
};

export const OFF_NOTICE =
  "<system-reminder>Caveman off from here: write normal prose.</system-reminder>";

// The switch-off phrases the rules name. They act like `/caveman off` from that turn on.
const OFF_PHRASE = /\b(stop caveman|normal mode)\b/i;

/** The parts of an OMP message these functions read; everything else passes through untouched. */
export interface Message {
  role: string;
  content?: unknown;
  attribution?: string;
  synthetic?: boolean;
  timestamp?: number;
}

/** The parts of a session entry `modeChanges` reads. */
export interface Entry {
  type: string;
  customType?: string;
  data?: unknown;
}

export interface ModeChange {
  mode: Mode;
  at: number;
}

interface TextBlock {
  type: "text";
  text: string;
}

/** `/caveman` switches recorded in the session branch, oldest first. Malformed entries are skipped. */
export function modeChanges(entries: readonly Entry[]): ModeChange[] {
  const changes: ModeChange[] = [];
  for (const entry of entries) {
    if (entry.type !== "custom" || entry.customType !== MODE_ENTRY) continue;
    const data = entry.data as Partial<ModeChange> | undefined;
    const mode = parseMode(data?.mode);
    if (mode && typeof data?.at === "number")
      changes.push({ mode, at: data.at });
  }
  return changes.sort((a, b) => a.at - b.at);
}

function textOf(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter(
      (block): block is TextBlock =>
        block?.type === "text" && typeof block.text === "string",
    )
    .map((block) => block.text)
    .join("\n");
}

function appendText(content: unknown, text: string): unknown {
  if (typeof content === "string") return `${content}\n\n${text}`;
  if (Array.isArray(content)) return [...content, { type: "text", text }];
  return [{ type: "text", text }];
}

/**
 * The mode in force at each message (undefined for anything but a human turn) and the mode now.
 * A turn is in the mode of the latest `/caveman` switch made before it, else `initial`; a
 * switch-off phrase in a turn turns it off from that turn until the next switch.
 */
export function modesByTurn(
  messages: readonly Message[],
  initial: Mode,
  changes: readonly ModeChange[],
): { modes: (Mode | undefined)[]; current: Mode } {
  let mode = initial;
  let next = 0;
  const modes = messages.map((message) => {
    // Human turns only: auto-continues and other agent-made user turns carry `attribution: "agent"`.
    if (
      message.role !== "user" ||
      message.attribution === "agent" ||
      message.synthetic === true
    )
      return undefined;
    while (
      next < changes.length &&
      changes[next].at <= (message.timestamp ?? 0)
    )
      mode = changes[next++].mode;
    if (OFF_PHRASE.test(textOf(message.content))) mode = "off";
    return mode;
  });
  if (next < changes.length) mode = changes[changes.length - 1].mode;
  return { modes, current: mode };
}

/**
 * Main session: the full rules and the reminder on the first human turn of each stretch in one
 * mode (the first visible turn after a compaction counts), the reminder alone on the other turns
 * of the stretch, the off notice on the turn that turns it off. Every turn's text depends only on
 * the turns before it, so earlier turns render the same bytes on every request and the prompt
 * cache keeps matching. Returns undefined when nothing changes.
 */
export function withModeTexts<T extends Message>(
  messages: readonly T[],
  modes: readonly (Mode | undefined)[],
  rules: Record<ActiveMode, string>,
): T[] | undefined {
  let previous: Mode = "off";
  let changed = false;
  const result = messages.map((message, index) => {
    const mode = modes[index];
    if (mode === undefined) return message;
    // The reminder goes last on a mode's first turn too: it is the directive for this reply.
    const text =
      mode === "off"
        ? previous === "off"
          ? undefined
          : OFF_NOTICE
        : mode === previous
          ? REMINDERS[mode]
          : `${rules[mode]}\n\n${REMINDERS[mode]}`;
    previous = mode;
    if (text === undefined) return message;
    changed = true;
    return { ...message, content: appendText(message.content, text) };
  });
  return changed ? result : undefined;
}

/** Subagent: the rules once, on its first user message (the task, which the parent agent wrote). */
export function withSubagentRules<T extends Message>(
  messages: readonly T[],
  rules: string,
): T[] | undefined {
  const index = messages.findIndex((message) => message.role === "user");
  if (index < 0) return undefined;
  return messages.map((message, i) =>
    i === index
      ? { ...message, content: appendText(message.content, rules) }
      : message,
  );
}
