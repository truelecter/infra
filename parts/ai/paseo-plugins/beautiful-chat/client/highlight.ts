import { useEffect, useState } from "react";
import { useRpc } from "@getpaseo/plugin/client";
import { highlightRpc, type HighlightLine, type HighlightToken } from "../shared/highlight-rpc";

export type { HighlightLine, HighlightToken };

export interface HighlightRequest {
  code: string;
  language?: string;
  filename?: string;
  dark: boolean;
  diffBodyCode?: string;
}

export interface HighlightResponse {
  lines: HighlightLine[] | null;
  diffLines: HighlightLine[] | null;
  [Symbol.iterator]?(): Iterator<HighlightLine[] | null>;
}

function makeResponse(
  lines: HighlightLine[] | null,
  diffLines: HighlightLine[] | null = null,
): HighlightResponse {
  return {
    lines,
    diffLines,
    *[Symbol.iterator]() {
      yield lines;
      yield diffLines;
    },
  };
}

const EMPTY_RESPONSE: HighlightResponse = makeResponse(null, null);

/**
 * Grammars live on the daemon, so every block pays one round trip. The cache
 * makes that trip once per distinct block: ten mounts of the same snippet in a
 * transcript share one answer, and a remount reads it back without a flash of
 * unhighlighted text.
 */
const CACHE_LIMIT = 200;

/** A null entry marks a key the daemon could not answer, so it is not retried. */
const cache = new Map<string, HighlightResponse | null>();
const inFlight = new Map<string, Promise<void>>();

/**
 * Hints the daemon answers unhighlighted on purpose. The author asked for plain
 * text, so an unhighlighted answer to one of these is the right answer and the
 * component must not colour it with the tokeniser instead.
 */
const PLAIN_HINTS: Record<string, true> = { plaintext: true, text: true, txt: true };

function isPlainHint(language: string | undefined): boolean {
  return language !== undefined && PLAIN_HINTS[language.trim().toLowerCase()] === true;
}

/**
 * 32-bit FNV-1a hash to produce compact cache keys without large string allocations.
 */
function fnv1a(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16);
}

/**
 * The theme picks the colours and the language picks the grammar, so both
 * belong in the key beside the code itself. `\u0000` cannot occur in a language
 * id or in a path, which keeps the parts from running together.
 */
function cacheKey(request: HighlightRequest): string {
  return [
    request.dark ? "dark" : "light",
    request.language ?? "",
    request.filename ?? "",
    fnv1a(request.code),
    request.diffBodyCode ? fnv1a(request.diffBodyCode) : "",
  ].join("\u0000");
}

function remember(key: string, response: HighlightResponse | null): void {
  cache.set(key, response);
  // Insertion order is the eviction order, so the oldest key is the first one.
  while (cache.size > CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

/**
 * A daemon without this handler, or one older than this contract, answers with
 * something else entirely. Reject that answer rather than render from it.
 */
function parseLines(rawLines: unknown): HighlightLine[] | null {
  if (!Array.isArray(rawLines)) return null;
  const lines: HighlightLine[] = [];
  for (const rawLine of rawLines) {
    const candidateLine: unknown = rawLine;
    if (!Array.isArray(candidateLine)) return null;
    const line: HighlightToken[] = [];
    for (const rawToken of candidateLine) {
      const token: unknown = rawToken;
      if (typeof token !== "object" || token === null) return null;
      if (!("text" in token) || typeof token.text !== "string") return null;
      const rawColor: unknown = "color" in token ? token.color : null;
      const color = typeof rawColor === "string" ? rawColor : rawColor === null ? null : undefined;
      if (color === undefined) return null;
      line.push({
        text: token.text,
        color,
        bold: "bold" in token && token.bold === true,
        italic: "italic" in token && token.italic === true,
      });
    }
    lines.push(line);
  }
  return lines;
}

/**
 * A daemon without this handler, or one older than this contract, answers with
 * something else entirely. Reject that answer rather than render from it.
 */
function readResponse(answer: unknown, allowPlain: boolean): HighlightResponse | null {
  if (typeof answer !== "object" || answer === null || !("lines" in answer)) return null;

  // A null language means the daemon sent the text back unhighlighted: no
  // grammar matched, or a size guard tripped on a huge or minified block. The
  // tokeniser in the component still colours that text, so treat that as no
  // answer and keep the fallback. A plain-text hint is the exception: plain is
  // what was asked for. Either way the key is cached, so nothing is retried.
  const language: unknown = "language" in answer ? answer.language : undefined;
  if (language !== null && typeof language !== "string") return null;
  if (language === null && !allowPlain) return null;

  const lines = parseLines(answer.lines);
  if (lines === null) return null;

  let diffLines: HighlightLine[] | null = null;
  if ("diffLines" in answer && answer.diffLines !== undefined && answer.diffLines !== null) {
    diffLines = parseLines(answer.diffLines);
  }

  return makeResponse(lines, diffLines);
}

type HighlightCall = (input: {
  code: string;
  language?: string;
  filename?: string;
  dark: boolean;
  diffBodyCode?: string;
}) => Promise<unknown>;

/**
 * One call per key. A second mount of the same block joins the promise already
 * in flight instead of asking the daemon to tokenise the same text again.
 */
function fetchLines(key: string, call: HighlightCall, request: HighlightRequest): Promise<void> {
  const pending = inFlight.get(key);
  if (pending) return pending;

  const started = call({
    code: request.code,
    language: request.language,
    filename: request.filename,
    dark: request.dark,
    diffBodyCode: request.diffBodyCode ? request.diffBodyCode : undefined,
  })
    .then((answer) => {
      remember(key, readResponse(answer, isPlainHint(request.language)));
    })
    .catch(() => {
      remember(key, null);
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, started);
  return started;
}

/**
 * The daemon's tokens for this block, or null while none are available. Null is
 * the caller's cue to keep drawing its own fallback: it covers the first paint,
 * a language the daemon cannot highlight, and a call that failed.
 */
export function useHighlightedLines(request: HighlightRequest): HighlightResponse {
  const call: HighlightCall = useRpc(highlightRpc);
  const { code, language, filename, dark, diffBodyCode } = request;
  const key = code.length > 0 ? cacheKey(request) : null;
  // Reading the cache during render, not in an effect, is what removes the
  // unhighlighted frame on a block that was tokenised once already.
  const cached = key !== null ? (cache.get(key) ?? null) : null;
  const [, bumpRevision] = useState(0);

  useEffect(() => {
    if (key === null || cache.has(key)) return;
    let mounted = true;
    void fetchLines(key, call, { code, language, filename, dark, diffBodyCode }).then(() => {
      if (mounted) bumpRevision((revision) => revision + 1);
    });
    return () => {
      mounted = false;
    };
  }, [key, call, code, language, filename, dark, diffBodyCode]);

  return cached ?? EMPTY_RESPONSE;
}
