import React, { useState, useCallback, useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Glyph } from "./glyph";
import { frosted } from "./frosted";
import { surfaceProps } from "./view-props";
import { glowing } from "./glow";
import { Pop } from "./motion";
import { radius, type ExtendedThemeTokens } from "./theme-tokens";
import { FileTypeLogo } from "./file-type-logo";
import { resolveFileIcon } from "../file-icon";
import { selectableSurface, unselectable } from "./selection";
import { selectionCodeSurface, selectionSurface } from "./selection-actions";
import { useHighlightedLines } from "../highlight";
import type { HighlightLine, HighlightToken } from "../../shared/highlight-rpc";

interface SyntaxHighlightProps {
  code: string;
  language?: "typescript" | "bash" | "diff" | "json" | "python" | string;
  tokens: ExtendedThemeTokens;
  showLineNumbers?: boolean;
  filename?: string;
  compact?: boolean;
  /** Shows the file in the machine's own file manager. Omitted: plain label. */
  onRevealFile?: () => void;
}

const STATIC_KEYWORDS: Record<string, true> = {
  import: true,
  export: true,
  from: true,
  default: true,
  const: true,
  let: true,
  var: true,
  function: true,
  return: true,
  async: true,
  await: true,
  if: true,
  else: true,
  switch: true,
  case: true,
  try: true,
  catch: true,
  type: true,
  interface: true,
  class: true,
  new: true,
  extends: true,
  implements: true,
};

const PYTHON_KEYWORDS: Record<string, true> = {
  import: true,
  from: true,
  as: true,
  def: true,
  lambda: true,
  return: true,
  yield: true,
  async: true,
  await: true,
  if: true,
  elif: true,
  else: true,
  for: true,
  while: true,
  in: true,
  is: true,
  not: true,
  and: true,
  or: true,
  try: true,
  except: true,
  finally: true,
  raise: true,
  with: true,
  class: true,
  pass: true,
  global: true,
  None: true,
  True: true,
  False: true,
  self: true,
};

/** Eval runs both kernels, so the callout must colour either dialect. */
function keywordsFor(language: string): Record<string, true> {
  return language === "python" ? PYTHON_KEYWORDS : STATIC_KEYWORDS;
}

/**
 * Strings, numbers, identifiers, and punctuation. Identifiers cover keywords
 * too, so the dialect lives in the lookup table rather than this pattern.
 */
const CODE_TOKEN_RE =
  /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\b\d+\b|[a-zA-Z_$][a-zA-Z0-9_$]*|[^\s\w]+)/g;

/**
 * The dialect used to colour code tokens. A diff carries no dialect of its own,
 * so it borrows the one belonging to the file being patched.
 */
function dialectFor(isDiff: boolean, language: string, filename?: string): string {
  if (!isDiff) return language;
  const ext = fileExtension(filename);
  if (ext === "py") return "python";
  if (ext === "html" || ext === "htm") return "html";
  if (ext === "css" || ext === "scss" || ext === "sass") return "css";
  return "typescript";
}

/**
 * Which tint a diff row carries, or null for context rows, hunk headers and
 * every non-diff block. Reading it for the neighbouring rows is what lets a
 * run of changes render as one shape instead of a stack of them.
 */
function diffTint(line: string | undefined, isDiff: boolean): "add" | "remove" | null {
  if (!isDiff || line === undefined) return null;
  if (line.startsWith("+")) return "add";
  if (line.startsWith("-")) return "remove";
  return null;
}

/** The lower-case extension of a path's last segment, or "" when it has none. */
function fileExtension(filename?: string): string {
  const base = (filename || "").toLowerCase().split(/[/\\]/).pop() || "";
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(dot + 1) : "";
}

/**
 * Extensions the daemon has a grammar for, minus the diff grammars themselves.
 *
 * The daemon resolves the grammar; this set only decides whether asking it is
 * worth a round trip. So an extension missing here costs one uncoloured diff,
 * never a wrong one.
 */
const CODE_FILE_EXTENSIONS: Record<string, true> = {
  ts: true,
  mts: true,
  cts: true,
  tsx: true,
  js: true,
  mjs: true,
  cjs: true,
  jsx: true,
  json: true,
  jsonc: true,
  sh: true,
  bash: true,
  zsh: true,
  py: true,
  pyi: true,
  yaml: true,
  yml: true,
  md: true,
  markdown: true,
  rs: true,
  go: true,
  html: true,
  htm: true,
  css: true,
  sql: true,
  toml: true,
  dockerfile: true,
  ps1: true,
  psm1: true,
};

/** Whether the patched file names a language the daemon can tokenise. */
function patchedFileIsCode(filename?: string): boolean {
  const base = (filename || "").toLowerCase().split(/[/\\]/).pop() || "";
  if (base === "dockerfile" || base.startsWith("dockerfile.")) return true;
  const ext = fileExtension(filename);
  return ext !== "" && CODE_FILE_EXTENSIONS[ext] === true;
}

/** A unified hunk header, which no source file opens a line with. */
const HUNK_HEADER_RE = /^@@ -\d+(?:,\d+)? \+\d+(?:,\d+)? @@/;
/** How far into a block a diff must announce itself before it reads as code. */
const DIFF_SCAN_LINES = 8;

/**
 * Whether a block is a unified diff whatever its label says. A tool labels a
 * patch with the file it patches often enough that the label cannot be trusted,
 * and the markers only make sense once the block is read as a diff.
 */
function looksLikeUnifiedDiff(lines: string[]): boolean {
  const limit = Math.min(lines.length, DIFF_SCAN_LINES);
  for (let idx = 0; idx < limit; idx += 1) {
    const line = lines[idx] ?? "";
    if (HUNK_HEADER_RE.test(line)) return true;
    if (line.startsWith("diff --git ")) return true;
    if (line.startsWith("--- ") && (lines[idx + 1] ?? "").startsWith("+++ ")) return true;
  }
  return false;
}

/** The two file headers open with a marker, so they are matched by shape. */
const DIFF_FILE_HEADER_RE = /^(?:---|\+\+\+)(?:\s|$)/;

/**
 * Whether the diff format owns this line rather than the patched file.
 *
 * Every body line of a unified diff opens with `+`, `-` or a space, so anything
 * else is chrome by construction: `@@`, `diff --git`, `index`, the mode lines
 * and `\ No newline at end of file`. The file headers are the exception, and
 * they are the reason this is not a bare first-character test.
 */
function isDiffChrome(line: string): boolean {
  if (line === "") return false;
  const head = line[0];
  if (head !== "+" && head !== "-" && head !== " ") return true;
  return DIFF_FILE_HEADER_RE.test(line);
}

/**
 * The diff's content with the markers taken off, for the file's own grammar.
 *
 * One line out per line in, so a token row still belongs to the row it is drawn
 * on: a chrome line contributes an empty line instead of disappearing, which
 * keeps every later line on its own number.
 */
function strippedDiffCode(lines: string[]): string {
  const stripped: string[] = [];
  for (const line of lines) {
    stripped.push(isDiffChrome(line) ? "" : line.slice(1));
  }
  return stripped.join("\n");
}

/** A tag opening or closing marks the text as markup. */
const HTML_LIKE = /<\/?[a-zA-Z][\w-]*(?:\s|\/?>)/;
/** A declaration inside a block marks the text as style rules. */
const CSS_LIKE = /[a-zA-Z-]+\s*:\s*[^;{}]+;/;

export function detectEmbedded(text: string): "html" | "css" | null {
  if (HTML_LIKE.test(text)) return "html";
  if (text.includes("{") && CSS_LIKE.test(text)) return "css";
  return null;
}

/**
 * JavaScript carries markup and style rules inside template literals, and a
 * literal routinely spans many lines. Highlighting runs per line, so the dialect
 * of each line is resolved up front: a template's whole body is read once,
 * classified once, and that verdict is applied to every line it covers.
 */
export function classifyLines(lines: string[], base: string): string[] {
  // A block that already declares itself markup or styles needs no detection.
  if (base === "html" || base === "css" || base === "bash") {
    return lines.map(() => base);
  }

  const dialects: string[] = new Array(lines.length).fill(base);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const open = line.indexOf("`");
    if (open === -1) continue;

    // Find the line that closes this template literal.
    let end = i;
    if (line.indexOf("`", open + 1) === -1) {
      while (end + 1 < lines.length && !lines[end + 1]?.includes("`")) end++;
      end = Math.min(end + 1, lines.length - 1);
    }

    const body = lines.slice(i, end + 1).join("\n");
    const embedded = detectEmbedded(body);
    if (embedded) {
      for (let j = i; j <= end; j++) dialects[j] = embedded;
    }
    i = end;
  }

  return dialects;
}

/** `${...}` stays JavaScript wherever it is spliced in. */
const INTERPOLATION_RE = /\$\{[^}]*\}/g;

/**
 * Splits a line on its interpolations, tokenising the literal parts with
 * `renderPart` and the spliced expressions as accented code.
 */
function renderWithInterpolation(
  line: string,
  tokens: ExtendedThemeTokens,
  renderPart: (text: string) => React.ReactNode,
): React.ReactNode {
  INTERPOLATION_RE.lastIndex = 0;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // Each literal run is wrapped so its own token array keeps a stable key.
  const pushLiteral = (text: string, index: number) => {
    parts.push(
      <Text key={`l${index}`} selectable>
        {renderPart(text)}
      </Text>,
    );
  };

  while ((match = INTERPOLATION_RE.exec(line)) !== null) {
    if (match.index > lastIndex) {
      pushLiteral(line.slice(lastIndex, match.index), lastIndex);
    }
    parts.push(
      <Text key={`i${match.index}`} selectable style={{ color: tokens.accent }}>
        {match[0]}
      </Text>,
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < line.length) pushLiteral(line.slice(lastIndex), lastIndex);
  return parts;
}

const HTML_TOKEN_RE =
  /(<!--[\s\S]*?-->|<\/?[a-zA-Z][\w-]*|\/?>|[a-zA-Z-]+(?=\s*=)|"[^"]*"|'[^']*'|=)/g;

function renderHtmlTokens(
  text: string,
  tokens: ExtendedThemeTokens,
  keyPrefix: string,
): React.ReactNode {
  HTML_TOKEN_RE.lastIndex = 0;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = HTML_TOKEN_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    const key = `${keyPrefix}h${match.index}`;

    if (token.startsWith("<!--")) {
      parts.push(
        <Text key={key} selectable style={{ color: tokens.syntax.comment }}>
          {token}
        </Text>,
      );
    } else if (token.startsWith("<") || token === ">" || token === "/>") {
      parts.push(
        <Text key={key} selectable style={{ color: tokens.syntax.keyword, fontWeight: "600" }}>
          {token}
        </Text>,
      );
    } else if (token.startsWith('"') || token.startsWith("'")) {
      parts.push(
        <Text key={key} selectable style={{ color: tokens.syntax.string }}>
          {token}
        </Text>,
      );
    } else if (token === "=") {
      parts.push(
        <Text key={key} selectable style={{ color: tokens.foregroundMuted }}>
          {token}
        </Text>,
      );
    } else {
      // An attribute name, matched by its lookahead to `=`.
      parts.push(
        <Text key={key} selectable style={{ color: tokens.syntax.property }}>
          {token}
        </Text>,
      );
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

const CSS_TOKEN_RE =
  /(\/\*[\s\S]*?\*\/|[{}:;]|"[^"]*"|'[^']*'|#[0-9a-fA-F]{3,8}\b|-?\d+(?:\.\d+)?(?:px|em|rem|%|vh|vw|s|ms|fr|deg)?|[@.#]?[a-zA-Z][\w-]*)/g;

function renderCssTokens(
  text: string,
  tokens: ExtendedThemeTokens,
  keyPrefix: string,
): React.ReactNode {
  CSS_TOKEN_RE.lastIndex = 0;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  // A name before the first colon is a property; after it, a value.
  let inValue = false;

  while ((match = CSS_TOKEN_RE.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    const token = match[0];
    const key = `${keyPrefix}c${match.index}`;

    if (token.startsWith("/*")) {
      parts.push(
        <Text key={key} selectable style={{ color: tokens.syntax.comment }}>
          {token}
        </Text>,
      );
    } else if (token === ":") {
      inValue = true;
      parts.push(
        <Text key={key} selectable style={{ color: tokens.foregroundMuted }}>
          {token}
        </Text>,
      );
    } else if (token === ";" || token === "{" || token === "}") {
      inValue = false;
      parts.push(
        <Text key={key} selectable style={{ color: tokens.foregroundMuted }}>
          {token}
        </Text>,
      );
    } else if (token.startsWith("#") && /^#[0-9a-fA-F]{3,8}$/.test(token)) {
      parts.push(
        <Text key={key} selectable style={{ color: tokens.syntax.number }}>
          {token}
        </Text>,
      );
    } else if (/^-?\d/.test(token)) {
      parts.push(
        <Text key={key} selectable style={{ color: tokens.syntax.number }}>
          {token}
        </Text>,
      );
    } else if (token.startsWith('"') || token.startsWith("'")) {
      parts.push(
        <Text key={key} selectable style={{ color: tokens.syntax.string }}>
          {token}
        </Text>,
      );
    } else if (inValue) {
      parts.push(
        <Text key={key} selectable style={{ color: tokens.syntax.string }}>
          {token}
        </Text>,
      );
    } else if (token.startsWith("@") || token.startsWith(".") || token.startsWith("#")) {
      parts.push(
        <Text key={key} selectable style={{ color: tokens.syntax.keyword, fontWeight: "600" }}>
          {token}
        </Text>,
      );
    } else {
      parts.push(
        <Text key={key} selectable style={{ color: tokens.syntax.property }}>
          {token}
        </Text>,
      );
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

export function SyntaxHighlightBlock({
  code,
  language = "typescript",
  tokens,
  showLineNumbers = false,
  filename,
  compact = false,
  onRevealFile,
}: SyntaxHighlightProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(code).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }, [code]);

  const lines = useMemo(() => code.trimEnd().split("\n"), [code]);
  // A diff is a diff whatever the label says, and everything below reads this
  // flag rather than the label.
  const isDiff = useMemo(
    () => language === "diff" || looksLikeUnifiedDiff(lines),
    [language, lines],
  );
  const codeLanguage = useMemo(
    () => dialectFor(isDiff, language, filename),
    [isDiff, language, filename],
  );
  // The file icon already names the language. The text badge only earns its
  // place when no specific icon exists for the file.
  const showLanguageBadge = useMemo(
    () => resolveFileIcon(filename, language) === null,
    [filename, language],
  );
  const lineDialects = useMemo(() => classifyLines(lines, codeLanguage), [lines, codeLanguage]);
  const diffBodyCode = useMemo(
    () => (isDiff && patchedFileIsCode(filename) ? strippedDiffCode(lines) : undefined),
    [isDiff, filename, lines],
  );
  // Grammar-accurate colours arrive from the daemon one round trip late, and
  // never for a language it has no grammar for. Until then, and after a failed
  // call, the rows below fall back to the tokeniser in this file.
  const highlightResult = useHighlightedLines({
    code,
    language,
    filename,
    dark: tokens.isDark,
    diffBodyCode,
  });
  const shikiLines = highlightResult?.lines;
  const diffBodyLines = highlightResult?.diffLines;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          ...selectableSurface,
          backgroundColor: tokens.surfaceCodeGlass,
          borderRadius: radius.card,
          borderWidth: 1,
          borderColor: tokens.borderSubtle,
          ...tokens.boxShadow,
          overflow: "hidden",
          marginVertical: compact ? 4 : 8,
        },
        header: {
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 8,
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderBottomWidth: 1,
          borderBottomColor: tokens.borderSubtle,
          backgroundColor: tokens.surface1,
        },
        // A long path wraps onto further lines instead of running under the
        // copy button, so the file name stays readable at any pane width.
        headerLeft: {
          flexDirection: "row",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 8,
          flexShrink: 1,
          minWidth: 0,
        },
        filename: {
          fontSize: 12,
          lineHeight: 17,
          fontFamily: tokens.fontUi,
          fontWeight: "600",
          color: tokens.foregroundMuted,
          flexShrink: 1,
        },
        filenameButton: {
          flexShrink: 1,
          minWidth: 0,
        },
        filenameLink: {
          color: tokens.accent,
          textDecorationLine: "underline",
          ...unselectable,
        },
        langBadge: {
          fontFamily: tokens.fontUi,
          fontSize: 11,
          fontWeight: "500",
          textTransform: "uppercase",
          letterSpacing: 0.5,
          color: tokens.foregroundSubtle,
          backgroundColor: tokens.surface2,
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: radius.chip,
        },
        copyButton: {
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: radius.block,
          backgroundColor: tokens.surface2,
          flexShrink: 0,
        },
        copyText: {
          fontFamily: tokens.fontUi,
          fontSize: 11,
          color: copied ? tokens.success : tokens.foregroundMuted,
          fontWeight: "500",
          ...unselectable,
        },
        codeArea: {
          padding: compact ? 8 : 12,
        },
        lineRow: {
          flexDirection: "row",
          alignItems: "flex-start",
        },
        lineNumber: {
          width: 32,
          fontSize: 12,
          fontFamily: tokens.fontMono,
          color: tokens.foregroundSubtle,
          textAlign: "right",
          paddingRight: 10,
          ...unselectable,
        },
        lineContent: {
          flex: 1,
          fontSize: 12,
          lineHeight: 18,
          fontFamily: tokens.fontCode,
          color: tokens.foreground,
        },
      }),
    [tokens, compact, copied],
  );

  return (
    // No pointer glow here: a code block is an inner surface, and lighting it
    // separately from the card that holds it reads as two hovers at once.
    <View {...surfaceProps(frosted, selectionSurface)} style={styles.container}>
      {(filename || language) && (
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <FileTypeLogo filename={filename} language={language} size="sm" />
            {filename ? (
              onRevealFile ? (
                <Pressable
                  onPress={onRevealFile}
                  accessibilityRole="link"
                  accessibilityLabel={`Show ${filename} in the file manager`}
                  style={styles.filenameButton}
                >
                  <Text style={[styles.filename, styles.filenameLink]}>{filename}</Text>
                </Pressable>
              ) : (
                <Text selectable style={styles.filename}>
                  {filename}
                </Text>
              )
            ) : null}
            {showLanguageBadge ? (
              <Text selectable style={styles.langBadge}>
                {language}
              </Text>
            ) : null}
          </View>
          <Pressable onPress={handleCopy} style={styles.copyButton}>
            <Pop trigger={copied}>
              <Glyph
                name={copied ? "Check" : "Copy"}
                size={12}
                color={copied ? tokens.success : tokens.foregroundMuted}
              />
            </Pop>
            <Text style={styles.copyText}>{copied ? "Copied" : "Copy"}</Text>
          </Pressable>
        </View>
      )}

      <View {...selectionCodeSurface} style={styles.codeArea}>
        {lines.map((line, idx) => {
          const shikiLine = shikiLines?.[idx];
          // The patched file's tokens, and only for a line the file owns. A
          // chrome line keeps the diff rendering it has today.
          const bodyLine = isDiff && !isDiffChrome(line) ? diffBodyLines?.[idx] : undefined;
          const kind = diffTint(lines[idx], isDiff);
          const lineBg =
            kind === "add"
              ? tokens.syntax.diffAddBg
              : kind === "remove"
                ? tokens.syntax.diffRemoveBg
                : "transparent";

          // Adjacent added and removed rows form one hunk. Only the hunk's
          // outer edges round, so a delete-to-add transition stays flush.
          const previousKind = diffTint(lines[idx - 1], isDiff);
          const nextKind = diffTint(lines[idx + 1], isDiff);
          const opensRun = kind !== null && previousKind === null;
          const closesRun = kind !== null && nextKind === null;
          const corner = radius.chip;

          return (
            <View
              key={idx}
              style={[
                styles.lineRow,
                {
                  backgroundColor: lineBg,
                  borderTopLeftRadius: opensRun ? corner : 0,
                  borderTopRightRadius: opensRun ? corner : 0,
                  borderBottomLeftRadius: closesRun ? corner : 0,
                  borderBottomRightRadius: closesRun ? corner : 0,
                },
              ]}
            >
              {showLineNumbers && <Text style={styles.lineNumber}>{idx + 1}</Text>}
              <Text selectable style={styles.lineContent}>
                {bodyLine
                  ? renderDiffBodyLine(line, bodyLine, tokens)
                  : shikiLine
                    ? renderShikiLine(shikiLine, tokens)
                    : renderSyntaxLine(
                        line,
                        isDiff,
                        language,
                        lineDialects[idx] ?? codeLanguage,
                        tokens,
                      )}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/**
 * One line as the daemon tokenised it. A token the theme gives no colour takes
 * the body colour, which is what shiki's own renderer does.
 */
function consolidateTokens(tokens: HighlightToken[]): HighlightToken[] {
  if (tokens.length <= 1) return tokens;
  const result: HighlightToken[] = [];
  let current = { ...tokens[0]! };
  for (let i = 1; i < tokens.length; i++) {
    const next = tokens[i]!;
    if (
      next.color === current.color &&
      Boolean(next.bold) === Boolean(current.bold) &&
      Boolean(next.italic) === Boolean(current.italic)
    ) {
      current.text += next.text;
    } else {
      result.push(current);
      current = { ...next };
    }
  }
  result.push(current);
  return result;
}

function renderShikiLine(line: HighlightLine, tokens: ExtendedThemeTokens): React.ReactNode {
  return consolidateTokens(line).map((token, idx) => (
    <Text
      key={idx}
      selectable
      style={{
        color: token.color ?? tokens.foreground,
        fontWeight: token.bold ? "600" : "400",
        fontStyle: token.italic ? "italic" : "normal",
      }}
    >
      {token.text}
    </Text>
  ));
}

/**
 * The marker column of a diff row. Rendering it the same way on both paths is
 * what keeps the arriving tokens from shifting the code sideways. A marker that
 * is neither add nor remove is the context row's own space: it is text, not
 * chrome, so it keeps its width and takes the body colour.
 */
function renderDiffMarker(marker: string, tokens: ExtendedThemeTokens): React.ReactNode {
  if (marker !== "+" && marker !== "-") return marker;
  return (
    <Text
      selectable
      style={{
        color: marker === "+" ? tokens.syntax.diffAddMarker : tokens.syntax.diffRemoveMarker,
        fontWeight: "600",
      }}
    >
      {marker}
    </Text>
  );
}

/**
 * One diff body row: its marker in the diff's colours, then the code as the
 * patched file's own grammar tokenised it. The diff grammar cannot do this —
 * it paints a row one colour from its marker — so the body was tokenised
 * separately, without the markers in the way.
 */
function renderDiffBodyLine(
  line: string,
  body: HighlightLine,
  tokens: ExtendedThemeTokens,
): React.ReactNode {
  return (
    <>
      {renderDiffMarker(line.slice(0, 1), tokens)}
      {renderShikiLine(body, tokens)}
    </>
  );
}

function renderSyntaxLine(
  line: string,
  isDiff: boolean,
  language: string,
  lineDialect: string,
  tokens: ExtendedThemeTokens,
): React.ReactNode {
  if (isDiff) {
    // Hunk headers are metadata, not code.
    if (line.startsWith("@@")) {
      return (
        <Text selectable style={{ color: tokens.syntax.comment }}>
          {line}
        </Text>
      );
    }

    // The body of a diff line is real code, so it gets the same tokens as
    // the file it came from. Only the marker carries the add/remove colour;
    // the row behind it is already tinted.
    const marker = line.startsWith("+") || line.startsWith("-") ? line.slice(0, 1) : "";
    const body = marker ? line.slice(1) : line;

    return (
      <>
        {marker ? renderDiffMarker(marker, tokens) : null}
        {renderDialectLine(body, lineDialect, tokens)}
      </>
    );
  }

  if (language === "bash") return renderBashTokens(line, tokens);
  return renderDialectLine(line, lineDialect, tokens);
}

/** One line, coloured in whichever dialect that line turned out to be. */
function renderDialectLine(
  line: string,
  dialect: string,
  tokens: ExtendedThemeTokens,
): React.ReactNode {
  if (dialect === "bash") return renderBashTokens(line, tokens);

  if (dialect === "html") {
    return renderWithInterpolation(line, tokens, (text) => renderHtmlTokens(text, tokens, ""));
  }

  if (dialect === "css") {
    return renderWithInterpolation(line, tokens, (text) => renderCssTokens(text, tokens, ""));
  }

  const commentMark = dialect === "python" ? "#" : "//";
  const commentIndex = line.indexOf(commentMark);
  if (commentIndex !== -1) {
    return (
      <>
        {renderCodeTokens(line.slice(0, commentIndex), dialect, tokens)}
        <Text selectable style={{ color: tokens.syntax.comment }}>
          {line.slice(commentIndex)}
        </Text>
      </>
    );
  }

  return renderCodeTokens(line, dialect, tokens);
}

function renderCodeTokens(
  text: string,
  language: string,
  tokens: ExtendedThemeTokens,
): React.ReactNode {
  const keywords = keywordsFor(language);
  const tokenRegex = CODE_TOKEN_RE;
  tokenRegex.lastIndex = 0;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const pushPlain = (plain: string) => {
    if (!plain) return;
    const last = parts[parts.length - 1];
    if (typeof last === "string") {
      parts[parts.length - 1] = last + plain;
    } else {
      parts.push(plain);
    }
  };

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      pushPlain(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    if (token.startsWith('"') || token.startsWith("'") || token.startsWith("`")) {
      parts.push(
        <Text key={match.index} selectable style={{ color: tokens.syntax.string }}>
          {token}
        </Text>,
      );
    } else if (keywords[token]) {
      parts.push(
        <Text
          key={match.index}
          selectable
          style={{ color: tokens.syntax.keyword, fontWeight: "600" }}
        >
          {token}
        </Text>,
      );
    } else if (/^\d+$/.test(token)) {
      parts.push(
        <Text key={match.index} selectable style={{ color: tokens.syntax.number }}>
          {token}
        </Text>,
      );
    } else {
      pushPlain(token);
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    pushPlain(text.slice(lastIndex));
  }

  return parts;
}

const BASH_COMMANDS: Record<string, true> = {
  pnpm: true,
  npm: true,
  npx: true,
  yarn: true,
  bun: true,
  git: true,
  cargo: true,
  docker: true,
  node: true,
  python: true,
  uv: true,
  cd: true,
  ls: true,
  cat: true,
  rm: true,
  cp: true,
  mv: true,
  mkdir: true,
  grep: true,
  find: true,
  curl: true,
  chmod: true,
  export: true,
  echo: true,
  paseo: true,
  ssh: true,
  sudo: true,
  apt: true,
  brew: true,
};

const BASH_SUBCOMMANDS: Record<string, true> = {
  run: true,
  build: true,
  test: true,
  install: true,
  add: true,
  remove: true,
  commit: true,
  push: true,
  pull: true,
  checkout: true,
  status: true,
  branch: true,
  merge: true,
  rebase: true,
  clone: true,
  diff: true,
  log: true,
  init: true,
  start: true,
  stop: true,
  reload: true,
  restart: true,
};

function renderBashTokens(line: string, tokens: ExtendedThemeTokens): React.ReactNode {
  if (line.startsWith("#")) {
    return (
      <Text selectable style={{ color: tokens.syntax.comment }}>
        {line}
      </Text>
    );
  }

  let promptPrefix = "";
  let commandStr = line;
  if (line.startsWith("$ ")) {
    promptPrefix = "$ ";
    commandStr = line.slice(2);
  }

  const tokenRegex =
    /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|--?[a-zA-Z0-9_-]+|&&|\|\||\||>|>>|;|[^\s"';|&>]+)/g;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let isFirstWord = true;

  const pushPlain = (plain: string) => {
    if (!plain) return;
    const last = parts[parts.length - 1];
    if (typeof last === "string") {
      parts[parts.length - 1] = last + plain;
    } else {
      parts.push(plain);
    }
  };

  while ((match = tokenRegex.exec(commandStr)) !== null) {
    if (match.index > lastIndex) {
      pushPlain(commandStr.slice(lastIndex, match.index));
    }

    const token = match[0];

    if (
      token === "&&" ||
      token === "||" ||
      token === "|" ||
      token === ">" ||
      token === ">>" ||
      token === ";"
    ) {
      isFirstWord = true;
      parts.push(
        <Text
          key={match.index}
          selectable
          style={{ color: tokens.syntax.keyword, fontWeight: "600" }}
        >
          {token}
        </Text>,
      );
    } else if (token.startsWith("-")) {
      parts.push(
        <Text key={match.index} selectable style={{ color: tokens.syntax.property }}>
          {token}
        </Text>,
      );
    } else if (token.startsWith('"') || token.startsWith("'")) {
      parts.push(
        <Text key={match.index} selectable style={{ color: tokens.syntax.string }}>
          {token}
        </Text>,
      );
    } else if (/^\d+$/.test(token)) {
      parts.push(
        <Text key={match.index} selectable style={{ color: tokens.syntax.number }}>
          {token}
        </Text>,
      );
    } else if (isFirstWord || BASH_COMMANDS[token]) {
      isFirstWord = false;
      parts.push(
        <Text key={match.index} selectable style={{ color: tokens.accent, fontWeight: "600" }}>
          {token}
        </Text>,
      );
    } else if (BASH_SUBCOMMANDS[token]) {
      parts.push(
        <Text key={match.index} selectable style={{ color: tokens.syntax.function }}>
          {token}
        </Text>,
      );
    } else {
      pushPlain(token);
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < commandStr.length) {
    pushPlain(commandStr.slice(lastIndex));
  }
  return (
    <>
      {promptPrefix ? (
        <Text selectable style={{ color: tokens.foregroundSubtle, fontWeight: "600" }}>
          {promptPrefix}
        </Text>
      ) : null}
      {parts}
    </>
  );
}

/**
 * Whole-line verdicts in command output. A line that opens with one of these
 * takes its colour, because that is the part a reader scans for.
 */
const LINE_VERDICTS: Array<{
  re: RegExp;
  tone: "success" | "danger" | "warning";
}> = [
  { re: /^\s*(?:PASS|OK|DONE|SUCCESS|✓|✔)\b/i, tone: "success" },
  { re: /^\s*(?:FAIL(?:ED)?|ERROR|ERR|FATAL|✕|✗|×)\b/i, tone: "danger" },
  { re: /^\s*(?:WARN(?:ING)?|SKIP(?:PED)?|DEPRECATED)\b/i, tone: "warning" },
];

/** Inline spans worth colouring inside an otherwise plain output line. */
const OUTPUT_TOKENS =
  /(https?:\/\/[^\s]+|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\b[\w.-]+\.[a-z]{1,5}(?::\d+)?\b|\b\d+(?:\.\d+)?(?:ms|s|m|h|%|KB|MB|GB)?\b|\b(?:PASS|OK|DONE|SUCCESS)\b|\b(?:FAIL(?:ED)?|ERROR|FATAL)\b|\b(?:WARN(?:ING)?|SKIPPED)\b)/g;

/**
 * Command output, coloured. Verdict lines take one tone end to end; everything
 * else keeps muted body text with counts, durations, paths, and quoted values
 * lifted out so the numbers are findable.
 */
export function renderTerminalOutput(text: string, tokens: ExtendedThemeTokens): React.ReactNode {
  const lines = text.replace(/\s+$/, "").split("\n");

  return lines.map((line, lineIdx) => {
    const key = `out-${lineIdx}`;

    const verdict = LINE_VERDICTS.find((v) => v.re.test(line));
    if (verdict) {
      const tone =
        verdict.tone === "success"
          ? tokens.success
          : verdict.tone === "danger"
            ? tokens.danger
            : tokens.warning;
      return (
        <Text key={key} selectable style={{ color: tone }}>
          {line}
          {lineIdx < lines.length - 1 ? "\n" : ""}
        </Text>
      );
    }

    if (line.startsWith("+")) {
      return (
        <Text key={key} selectable style={{ color: tokens.syntax.diffAddMarker }}>
          {line}
          {lineIdx < lines.length - 1 ? "\n" : ""}
        </Text>
      );
    }
    if (line.startsWith("-") && !line.startsWith("--")) {
      return (
        <Text key={key} selectable style={{ color: tokens.syntax.diffRemoveMarker }}>
          {line}
          {lineIdx < lines.length - 1 ? "\n" : ""}
        </Text>
      );
    }

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    OUTPUT_TOKENS.lastIndex = 0;

    while ((match = OUTPUT_TOKENS.exec(line)) !== null) {
      if (match.index > lastIndex) {
        parts.push(line.slice(lastIndex, match.index));
      }
      const token = match[0];
      const spanKey = `${key}-${match.index}`;
      let color = tokens.foreground;

      if (/^https?:\/\//.test(token)) {
        color = tokens.accent;
      } else if (token.startsWith('"') || token.startsWith("'")) {
        color = tokens.syntax.string;
      } else if (/^(?:PASS|OK|DONE|SUCCESS)$/i.test(token)) {
        color = tokens.success;
      } else if (/^(?:FAIL(?:ED)?|ERROR|FATAL)$/i.test(token)) {
        color = tokens.danger;
      } else if (/^(?:WARN(?:ING)?|SKIPPED)$/i.test(token)) {
        color = tokens.warning;
      } else if (/^\d/.test(token)) {
        color = tokens.syntax.number;
      } else {
        color = tokens.syntax.property;
      }

      parts.push(
        <Text key={spanKey} selectable style={{ color }}>
          {token}
        </Text>,
      );
      lastIndex = match.index + token.length;
    }

    if (lastIndex < line.length) {
      parts.push(line.slice(lastIndex));
    }

    return (
      <Text key={key} selectable style={{ color: tokens.foregroundMuted }}>
        {parts}
        {lineIdx < lines.length - 1 ? "\n" : ""}
      </Text>
    );
  });
}
