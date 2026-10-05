/**
 * Harness text that the host files as a chat message.
 *
 * omp sends job results, IRC relays and reminders as `custom` messages. The
 * host claims two shapes — advisor notes and `<system-notice>` — and turns
 * everything else into a message carrying the raw text
 * (`providers/omp/agent.ts:2027`, and the same fallback on history replay in
 * `providers/omp/message-history.js`). The XML envelope then lands in the chat
 * as if the model had typed it.
 *
 * This reads the envelope back so the plugin can draw it as a card. It never
 * guesses: a string that does not open with a known tag returns null and is
 * rendered as ordinary prose.
 */
export type SystemEnvelopeKind = "job" | "message" | "reminder" | "process" | "notice";

export interface SystemEnvelopeChip {
  label: string;
  value: string;
}

export interface SystemEnvelope {
  kind: SystemEnvelopeKind;
  /** One line, already read: what happened. */
  title: string;
  /** Short facts worth a chip each — agent, status, duration, size. */
  chips: SystemEnvelopeChip[];
  /** Everything else, verbatim. Empty when the title says it all. */
  body: string;
  /** True when the envelope reports a failure. */
  failed: boolean;
}

const TAG_KINDS: Record<string, SystemEnvelopeKind> = {
  "system-notice": "notice",
  "system-reminder": "reminder",
  irc: "message",
  "system-interrupt": "reminder",
  "paseo-system": "notice",
  "agent-response": "message",
};

const TASK_RESULT = /<task-result\b([^>]*)>([\s\S]*?)<\/task-result>/i;
const META = /<meta\b([^>]*)\/?>/i;
const PREVIEW = /<preview\b[^>]*>([\s\S]*?)<\/preview>/i;
const OUTPUT = /<output>([\s\S]*?)<\/output>/i;
const ATTRIBUTE = /([\w-]+)="([^"]*)"/g;
const IRC_SENDER = /Incoming IRC message from agent `([^`]+)`:?/i;
// A launch line, not any sentence opening with those two words: the verb has
// to be one the process supervisor actually reports.
const PROCESS_LINE =
  /^Supervised process ([\w.-]+) ((?:exited|started|stopped|restarted|failed|is ready)\b.*)$/;

function attributes(source: string): Map<string, string> {
  const found = new Map<string, string>();
  for (const match of source.matchAll(ATTRIBUTE)) {
    const name = match[1];
    const value = match[2];
    if (name && value) found.set(name, value.trim());
  }
  return found;
}

/** The first line of prose in a block, skipping tags and blank lines. */
function firstProseLine(text: string): string | null {
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("<")) return trimmed;
  }
  return null;
}

/** Strips every tag line, leaving the payload a card should show. */
function stripTags(text: string): string {
  return text
    .split("\n")
    .filter((line) => !/^\s*<\/?[\w-]/.test(line))
    .join("\n")
    .trim();
}

function readJobEnvelope(inner: string): SystemEnvelope | null {
  const result = inner.match(TASK_RESULT);
  if (!result) return null;

  const attrs = attributes(result[1] ?? "");
  const id = attrs.get("id") ?? "job";
  const status = attrs.get("status") ?? "completed";
  const chips: SystemEnvelopeChip[] = [];
  const agent = attrs.get("agent");
  if (agent) chips.push({ label: "agent", value: agent });
  const duration = attrs.get("duration");
  if (duration) chips.push({ label: "took", value: duration });

  const meta = result[2]?.match(META);
  if (meta) {
    const metaAttrs = attributes(meta[1] ?? "");
    const lines = metaAttrs.get("lines");
    const size = metaAttrs.get("size");
    // A bare "75" on a chip says nothing; the unit is the information.
    if (lines) chips.push({ label: "lines", value: `${lines} lines` });
    if (size) chips.push({ label: "size", value: size });
  }

  const payload = result[2] ?? "";
  const body = (
    payload.match(PREVIEW)?.[1] ??
    payload.match(OUTPUT)?.[1] ??
    stripTags(payload)
  ).trim();

  return {
    kind: "job",
    title: `${id} ${status}`,
    chips,
    body,
    failed: /fail|error|cancel/i.test(status),
  };
}

export function parseSystemEnvelope(text: string): SystemEnvelope | null {
  const trimmed = text.trim();

  const process = trimmed.match(PROCESS_LINE);
  if (process && !trimmed.includes("\n")) {
    return {
      kind: "process",
      title: `${process[1]} ${process[2]}`,
      chips: [],
      body: "",
      failed: /fail|error|without an exit code|non-zero/i.test(process[2] ?? ""),
    };
  }

  // The opening tag may carry attributes: `<system-interrupt reason="…">`.
  const open = trimmed.match(/^<([\w-]+)(?:\s[^>]*)?>/);
  const tag = open?.[1]?.toLowerCase();
  if (!tag) return null;
  const kind = TAG_KINDS[tag];
  if (!kind) return null;

  const close = `</${tag}>`;
  const end = trimmed.lastIndexOf(close);
  const inner = trimmed.slice((open?.[0] ?? "").length, end === -1 ? undefined : end).trim();

  const job = readJobEnvelope(inner);
  if (job) return job;

  if (kind === "message") {
    const sender = inner.match(IRC_SENDER);
    if (sender) {
      const body = inner.slice((sender.index ?? 0) + sender[0].length).trim();
      return { kind, title: `Message from ${sender[1]}`, chips: [], body, failed: false };
    }
  }

  const title = firstProseLine(inner) ?? (kind === "reminder" ? "Reminder" : "System notice");
  const body = stripTags(inner.replace(title, "")).trim();
  return { kind, title, chips: [], body, failed: /error|fail/i.test(title) };
}
