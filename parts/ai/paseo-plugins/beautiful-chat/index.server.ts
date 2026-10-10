import type { PluginServerContext } from "@getpaseo/plugin/server";
import {
  type HighlightLine,
  type HighlightToken,
  highlightRpc,
} from "./shared/highlight-rpc";

const DARK_THEME = "github-dark-default";
const LIGHT_THEME = "github-light-default";

/**
 * Tokenising runs on the daemon's event loop, so a runaway tool output would
 * stall every other request. Code past 400 KB or 4000 lines comes back
 * unhighlighted instead.
 *
 * The line limit is separate because the heavy grammars, TypeScript and shell
 * among them, cost time quadratic in the length of one line: measured here,
 * one 1 KB line takes about 40 ms, one 4 KB line about 640 ms, and one 400 KB
 * line never finishes. A line that long is minified code or an encoded blob,
 * whose colours nobody reads, so a single over-long line makes the whole block
 * plain as well.
 */
const MAX_CODE_BYTES = 400 * 1024;
const MAX_CODE_LINES = 4000;
const MAX_LINE_CHARS = 1000;

/** shiki packs the style flags into one number. Only these two reach the client. */
const FONT_STYLE_ITALIC = 1;
const FONT_STYLE_BOLD = 2;

/**
 * Hints that no grammar answers to on its own.
 *
 * A grammar registers its own aliases, so `bash` already reaches `shellscript`
 * and `ts` already reaches `typescript`. These entries pin the mapping so it
 * survives a grammar dropping an alias, and they route the plain-text hints to
 * null instead of to a grammar.
 */
const ALIASES: Record<string, string | null> = {
  ts: "typescript",
  tsx: "tsx",
  js: "javascript",
  jsx: "jsx",
  sh: "shellscript",
  bash: "shellscript",
  shell: "shellscript",
  zsh: "shellscript",
  py: "python",
  md: "markdown",
  yml: "yaml",
  docker: "docker",
  dockerfile: "docker",
  ps1: "powershell",
  rs: "rust",
  golang: "go",
  plaintext: null,
  text: null,
  txt: null,
};

/** File extensions the chat shows often, lower-case and without the dot. */
const EXTENSIONS: Record<string, string> = {
  ts: "typescript",
  mts: "typescript",
  cts: "typescript",
  tsx: "tsx",
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  jsx: "jsx",
  json: "json",
  jsonc: "json",
  sh: "shellscript",
  bash: "shellscript",
  zsh: "shellscript",
  py: "python",
  pyi: "python",
  diff: "diff",
  patch: "diff",
  yaml: "yaml",
  yml: "yaml",
  md: "markdown",
  markdown: "markdown",
  rs: "rust",
  go: "go",
  html: "html",
  htm: "html",
  css: "css",
  sql: "sql",
  toml: "toml",
  dockerfile: "docker",
  ps1: "powershell",
  psm1: "powershell",
};

type ShikiCore = typeof import("@shikijs/core");
type Highlighter = Awaited<ReturnType<ShikiCore["createHighlighterCore"]>>;

/** The part of a shiki token this plugin reads. */
interface ShikiToken {
  content: string;
  color?: string;
  fontStyle?: number;
}

interface HighlightEngine {
  highlighter: Highlighter;
  /** Every grammar name and alias the highlighter answers to. */
  loaded: Set<string>;
}

let enginePromise: Promise<HighlightEngine> | null = null;

/**
 * Loads the grammars, the themes and the regex engine on the first request.
 *
 * The imports stay inside this function on purpose. Together they are several
 * megabytes of grammar data, and the daemon loads this plugin on every start,
 * so evaluating them up front would cost every session that never shows code.
 * esbuild keeps a dynamic import in the same bundle, it only defers running it.
 *
 * The JavaScript regex engine is deliberate too: the Oniguruma engine needs a
 * WASM file at runtime, and a bundled plugin has no asset to load it from.
 * `forgiving` makes a pattern JavaScript cannot express skip its own rule
 * instead of failing the whole grammar.
 */
async function buildEngine(): Promise<HighlightEngine> {
  const [core, regex] = await Promise.all([
    import("@shikijs/core"),
    import("@shikijs/engine-javascript"),
  ]);
  const themes = await Promise.all([
    import("@shikijs/themes/github-dark-default"),
    import("@shikijs/themes/github-light-default"),
  ]);
  // Every subpath below is also the grammar id, except `dockerfile`, whose
  // grammar registers as `docker`.
  const langs = await Promise.all([
    import("@shikijs/langs/typescript"),
    import("@shikijs/langs/tsx"),
    import("@shikijs/langs/javascript"),
    import("@shikijs/langs/jsx"),
    import("@shikijs/langs/json"),
    import("@shikijs/langs/shellscript"),
    import("@shikijs/langs/python"),
    import("@shikijs/langs/diff"),
    import("@shikijs/langs/yaml"),
    import("@shikijs/langs/markdown"),
    import("@shikijs/langs/rust"),
    import("@shikijs/langs/go"),
    import("@shikijs/langs/html"),
    import("@shikijs/langs/css"),
    import("@shikijs/langs/sql"),
    import("@shikijs/langs/toml"),
    import("@shikijs/langs/dockerfile"),
    import("@shikijs/langs/powershell"),
  ]);

  const highlighter = await core.createHighlighterCore({
    themes,
    langs,
    engine: regex.createJavaScriptRegexEngine({ forgiving: true }),
  });
  return { highlighter, loaded: new Set(highlighter.getLoadedLanguages()) };
}

function getEngine(): Promise<HighlightEngine> {
  enginePromise ??= buildEngine().catch((error: unknown) => {
    // Drop the memo so the next request retries. A promise that already
    // rejected would otherwise disable highlighting for the daemon's life.
    enginePromise = null;
    throw error;
  });
  return enginePromise;
}

/** Returns the last path segment of a file name, trimmed and lower-cased. */
function lastSegment(name: string): string {
  const parts = name.replace(/\\/g, "/").split("/");
  return (parts[parts.length - 1] ?? "").trim().toLowerCase();
}

/** Reads a grammar out of a file name, by extension or by a bare `Dockerfile`. */
function fromFileName(name: string): string | null {
  const base = lastSegment(name);
  if (base === "dockerfile" || base.startsWith("dockerfile.")) return "docker";
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return null;
  return EXTENSIONS[base.slice(dot + 1)] ?? null;
}

/**
 * Reads a grammar out of a language hint.
 *
 * Returns undefined when the hint names nothing known, which lets the caller
 * fall through to the file name, and null when it names plain text, which is
 * an answer and must not fall through.
 */
function fromHint(
  loaded: Set<string>,
  hint: string,
): string | null | undefined {
  const key = hint.trim().toLowerCase();
  if (!key) return undefined;
  if (Object.hasOwn(ALIASES, key)) {
    const mapped = ALIASES[key] ?? null;
    return mapped !== null && loaded.has(mapped) ? mapped : null;
  }
  return loaded.has(key) ? key : undefined;
}

/** Picks the grammar for a request, or null to render the text unhighlighted. */
function resolveLanguage(
  loaded: Set<string>,
  hint: string | undefined,
  filename: string | undefined,
): string | null {
  if (hint) {
    const named = fromHint(loaded, hint);
    if (named !== undefined) return named;
    // A hint is sometimes a path, because a tool labels a block with its file.
    const derived = fromFileName(hint);
    if (derived !== null && loaded.has(derived)) return derived;
  }
  if (filename) {
    const derived = fromFileName(filename);
    if (derived !== null && loaded.has(derived)) return derived;
  }
  return null;
}

function splitLines(code: string): string[] {
  return code.split(/\r?\n/);
}

/** Measures what the guards need in one pass, without allocating. */
function measure(code: string): { lines: number; longest: number } {
  let lines = 1;
  let longest = 0;
  let start = 0;
  for (;;) {
    const at = code.indexOf("\n", start);
    if (at === -1) {
      return { lines, longest: Math.max(longest, code.length - start) };
    }
    longest = Math.max(longest, at - start);
    lines += 1;
    start = at + 1;
  }
}

/** One token per line, uncoloured, so the client still renders the text. */
function plainLines(code: string): HighlightLine[] {
  return splitLines(code).map((text) =>
    text === "" ? [] : [{ text, color: null }],
  );
}

function toLines(
  tokenLines: readonly (readonly ShikiToken[])[],
): HighlightLine[] {
  return tokenLines.map((tokens) => {
    const line: HighlightLine = [];
    for (const token of tokens) {
      // An empty run carries no glyphs, and dropping it keeps the wire small.
      if (token.content === "") continue;
      const style = token.fontStyle ?? 0;
      const out: HighlightToken = {
        text: token.content,
        color: token.color ?? null,
      };
      if ((style & FONT_STYLE_BOLD) !== 0) out.bold = true;
      if ((style & FONT_STYLE_ITALIC) !== 0) out.italic = true;
      line.push(out);
    }
    return line;
  });
}

/**
 * Holds the last few results.
 *
 * A chat timeline mounts the same code block again on every re-render and on
 * every scroll back, so without this the daemon re-tokenises text it has
 * already seen. The key covers everything that changes the output. Map
 * iteration yields the oldest insertion first, which is the entry to evict.
 */
const CACHE_LIMIT = 200;
const cache = new Map<string, HighlightLine[]>();

function cachePut(key: string, lines: HighlightLine[]): void {
  if (cache.size >= CACHE_LIMIT) {
    const oldest = cache.keys().next();
    if (!oldest.done) cache.delete(oldest.value);
  }
  cache.set(key, lines);
}

/**
 * Fast 32-bit FNV-1a string hashing for compact cache keys.
 */
function fnv1a(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16);
}

function tokenize(
  highlighter: Highlighter,
  code: string,
  lang: string | null,
  dark: boolean,
  theme: string,
): HighlightLine[] {
  if (lang === null) return plainLines(code);

  const size = measure(code);
  if (
    Buffer.byteLength(code, "utf8") > MAX_CODE_BYTES ||
    size.lines > MAX_CODE_LINES ||
    size.longest > MAX_LINE_CHARS
  ) {
    return plainLines(code);
  }

  const key = `${dark ? "d" : "l"}:${lang}:${fnv1a(code)}`;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  try {
    const lines = toLines(
      highlighter.codeToTokens(code, { lang, theme }).tokens,
    );
    cachePut(key, lines);
    return lines;
  } catch {
    return plainLines(code);
  }
}

export default function contribute(server: PluginServerContext) {
  server.handle(highlightRpc, async (input) => {
    const theme = input.dark ? DARK_THEME : LIGHT_THEME;
    try {
      const { highlighter, loaded } = await getEngine();
      const language = resolveLanguage(loaded, input.language, input.filename);
      const lines = tokenize(
        highlighter,
        input.code,
        language,
        input.dark,
        theme,
      );

      let diffLines: HighlightLine[] | undefined;
      if (input.diffBodyCode !== undefined) {
        const diffLanguage = input.filename
          ? resolveLanguage(loaded, undefined, input.filename)
          : null;
        diffLines = tokenize(
          highlighter,
          input.diffBodyCode,
          diffLanguage,
          input.dark,
          theme,
        );
      }

      return {
        lines,
        ...(diffLines !== undefined ? { diffLines } : {}),
        language,
        theme,
      };
    } catch {
      // A grammar fault must not kill the daemon, and the client still needs
      // its text, so any failure degrades to the unhighlighted rendering.
      return {
        lines: plainLines(input.code),
        ...(input.diffBodyCode !== undefined
          ? { diffLines: plainLines(input.diffBodyCode) }
          : {}),
        language: null,
        theme,
      };
    }
  });

  // The highlighter and the cache sit at module scope on purpose, shared by
  // every contribution, so a single teardown must not dispose them.
  return () => {};
}
