import type { GitHubToolData } from "../shared/contracts";

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/** The subject of an op: whichever of these it carries, in reading order. */
function readSubject(record: Record<string, unknown>): string | undefined {
  const pr = record.pr;
  // A `pr` arrives as a number, a string or an array of either, and reads as a
  // bare digit run unless it carries its hash.
  const pullRequest = Array.isArray(pr)
    ? pr.map((entry) => `#${String(entry).replace(/^#/, "")}`).join(" ")
    : typeof pr === "number" || asString(pr)
      ? `#${String(pr).replace(/^#/, "")}`
      : undefined;
  return (
    asString(record.path) ??
    asString(record.query) ??
    pullRequest ??
    asString(record.run) ??
    asString(record.branch) ??
    asString(record.title)
  );
}

/** A grammar for a path, so a file the device read highlights like a file read. */
const LANGUAGES: Record<string, string> = {
  ts: "typescript",
  tsx: "tsx",
  mts: "typescript",
  cts: "typescript",
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  jsx: "jsx",
  json: "json",
  jsonc: "json",
  md: "markdown",
  yml: "yaml",
  yaml: "yaml",
  toml: "toml",
  sh: "bash",
  bash: "bash",
  py: "python",
  rs: "rust",
  go: "go",
  html: "html",
  css: "css",
  sql: "sql",
};

function languageFor(path: string | undefined): string | undefined {
  if (!path) return undefined;
  const base = path.split(/[/\\]/).pop() ?? path;
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return undefined;
  return LANGUAGES[base.slice(dot + 1).toLowerCase()];
}

const URL_IN_TEXT = /https?:\/\/[^\s"'<>)]+/;

/**
 * A run or check line. `gh` separates the columns with tabs, and a terminal
 * that has already expanded them separates with runs of spaces, so both count.
 */
const CHECK_LINE =
  /^(.{1,60}?)(?:\t+|\s{2,})(pass|fail|failing|pending|skipping|skipped|cancelled)\b(.*)$/i;

/** A search hit as the op prints it: `path/to/file.ts:12: const x = 1`. */
const SEARCH_LINE = /^([\w./\\-]+\.[\w]+):(\d+):/;

/** `#125 Add beautiful-chat`, or the number inside a pull-request URL. */
const PR_LINE = /(?:^|\s)#(\d+)\b\s*(.*)$/;
const PR_URL = /\/pull\/(\d+)\b/;

function checkRows(text: string): GitHubToolData["rows"] {
  const rows: NonNullable<GitHubToolData["rows"]> = [];
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(CHECK_LINE);
    if (!match) continue;
    const state = (match[2] ?? "").toLowerCase();
    const trailing = (match[3] ?? "").trim().split(/[\s\t]+/)[0] ?? "";
    // The op prints a duration and a URL after the state; the duration is the
    // part worth a row, and a bare `0` means the job never ran.
    const detail =
      /^\d+(?:\.\d+)?[a-z]*$/i.test(trailing) && trailing !== "0" ? ` ${trailing}` : "";
    rows.push({
      label: (match[1] ?? "").trim(),
      value: `${state}${detail}`,
      tone: state.startsWith("pass") ? "ok" : state.startsWith("fail") ? "bad" : undefined,
    });
  }
  return rows.length > 0 ? rows : undefined;
}

function searchRows(text: string): GitHubToolData["rows"] {
  const counts = new Map<string, number>();
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(SEARCH_LINE);
    if (!match?.[1]) continue;
    counts.set(match[1], (counts.get(match[1]) ?? 0) + 1);
  }
  if (counts.size === 0) return undefined;
  return [...counts].slice(0, 12).map(([label, count]) => ({ label, value: String(count) }));
}

/**
 * A `pr_*` op answers with a URL and little else, so the row is built from the
 * URL and from what the request asked for — which is the whole point of the
 * call and is otherwise invisible until the request is disclosed.
 */
function pullRequestRows(text: string, record: Record<string, unknown>): GitHubToolData["rows"] {
  const number = text.match(PR_LINE)?.[1] ?? text.match(PR_URL)?.[1];
  const title = asString(record.title) ?? text.match(PR_LINE)?.[2]?.trim();
  const rows: NonNullable<GitHubToolData["rows"]> = [];
  if (number) rows.push({ label: "pull request", value: `#${number}${title ? ` ${title}` : ""}` });

  const base = asString(record.base);
  const head = asString(record.head);
  if (base || head) {
    rows.push({ label: "base", value: `${base ?? "default"} ← ${head ?? "current branch"}` });
  }
  return rows.length > 0 ? rows : undefined;
}

/**
 * Reads a `github` device call into the record its card draws.
 *
 * The call arrives as a write to `xd://github`: `request` is a JSON op, and
 * `reply` is whatever the op printed. Everything here is derived from those
 * two strings, and an op with no recognised shape keeps its reply as text
 * rather than being forced into rows.
 */
export function buildGitHubData(
  request: string | undefined,
  reply: string | undefined,
): GitHubToolData | undefined {
  let record: Record<string, unknown> = {};
  if (request) {
    try {
      const parsed: unknown = JSON.parse(request);
      if (parsed && typeof parsed === "object") record = parsed as Record<string, unknown>;
    } catch {
      // A body that is not JSON is still a call; it just names no op.
    }
  }

  const op = asString(record.op);
  if (!op && !reply) return undefined;

  const data: GitHubToolData = { op: op ?? "github" };
  const repo = asString(record.repo);
  if (repo) data.repo = repo;
  const subject = readSubject(record);
  if (subject) data.subject = subject;
  if (request) data.request = request;
  if (!reply) return data;

  const link = reply.match(URL_IN_TEXT)?.[0];
  if (link) data.link = link;

  // `file_read` answers with the file itself, which belongs on the code
  // surface under its own name rather than in a terminal frame.
  if (op === "file_read") {
    const name = asString(record.path);
    data.file = { name: name ?? "file", code: reply };
    const language = languageFor(name);
    if (language) data.file.language = language;
    return data;
  }

  const kind = data.op;
  const rows =
    kind === "run_watch"
      ? checkRows(reply)
      : kind.startsWith("search_")
        ? searchRows(reply)
        : kind.startsWith("pr_")
          ? pullRequestRows(reply, record)
          : undefined;
  if (rows) {
    data.rows = rows;
    return data;
  }

  data.text = reply;
  return data;
}
