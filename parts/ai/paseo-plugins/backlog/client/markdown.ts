/**
 * A small Markdown parser for item descriptions: the GitHub-flavoured subset agents write in
 * notes. Paseo gives plugin UI no Markdown component, and HTML renderers don't work in React
 * Native, so this parses to a tree that `markdown-view.tsx` draws with Text and View.
 *
 * Blocks: paragraphs (line breaks kept), ATX headings, fenced code, block quotes, bullet,
 * numbered, and task lists (nested by indentation), and horizontal rules.
 * Inline: `code`, **strong**, *em* / _em_, ~~strike~~, [text](url), bare http(s) URLs, and
 * backslash escapes.
 */

export type Inline =
  | { type: "text"; text: string }
  | { type: "code"; text: string }
  | { type: "strong" | "em" | "del"; children: Inline[] }
  | { type: "link"; href: string; children: Inline[] };

export interface ListItem {
  /** Set on task items: `- [ ]` is false, `- [x]` is true. */
  checked?: boolean;
  children: Block[];
}

export type Block =
  | { type: "heading"; level: number; children: Inline[] }
  | { type: "paragraph"; children: Inline[] }
  | { type: "code"; text: string; lang?: string }
  | { type: "quote"; children: Block[] }
  | { type: "list"; ordered: boolean; start: number; items: ListItem[] }
  | { type: "rule" };

const FENCE = /^\s*(`{3,}|~{3,})\s*([^`\s]*)/;
const HEADING = /^\s{0,3}(#{1,6})\s+(.*?)(?:\s+#+)?\s*$/;
const RULE = /^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/;
const QUOTE = /^\s{0,3}>\s?/;
const LIST_ITEM = /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/;
const TASK = /^\[([ xX])\]\s+/;

function indentOf(line: string): number {
  return line.length - line.trimStart().length;
}

function startsBlock(line: string): boolean {
  return (
    FENCE.test(line) ||
    HEADING.test(line) ||
    RULE.test(line) ||
    QUOTE.test(line) ||
    LIST_ITEM.test(line)
  );
}

export function parseMarkdown(source: string): Block[] {
  return parseBlocks(source.replace(/\r\n?/g, "\n").split("\n"));
}

function parseBlocks(lines: string[]): Block[] {
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i += 1;
      continue;
    }

    const fence = FENCE.exec(line);
    if (fence) {
      const marker = fence[1];
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trimStart().startsWith(marker))
        body.push(lines[i++]);
      i += 1; // closing fence, or past the end when it is missing
      blocks.push({
        type: "code",
        text: body.join("\n"),
        ...(fence[2] ? { lang: fence[2] } : {}),
      });
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      blocks.push({
        type: "heading",
        level: heading[1].length,
        children: parseInline(heading[2]),
      });
      i += 1;
      continue;
    }

    // Before lists: "- - -" and "* * *" are rules, not list items.
    if (RULE.test(line)) {
      blocks.push({ type: "rule" });
      i += 1;
      continue;
    }

    if (QUOTE.test(line)) {
      const body: string[] = [];
      while (i < lines.length && QUOTE.test(lines[i]))
        body.push(lines[i++].replace(QUOTE, ""));
      blocks.push({ type: "quote", children: parseBlocks(body) });
      continue;
    }

    const item = LIST_ITEM.exec(line);
    if (item) {
      const next = parseList(lines, i, item);
      blocks.push(next.block);
      i = next.end;
      continue;
    }

    const body = [line.trim()];
    i += 1;
    while (i < lines.length && lines[i].trim() && !startsBlock(lines[i]))
      body.push(lines[i++].trim());
    blocks.push({ type: "paragraph", children: parseInline(body.join("\n")) });
  }
  return blocks;
}

/** One list: consecutive items of the same kind at the first item's indentation. */
function parseList(
  lines: string[],
  start: number,
  first: RegExpExecArray,
): { block: Block; end: number } {
  const indent = first[1].length;
  const ordered = /\d/.test(first[2]);
  const items: ListItem[] = [];
  let i = start;

  while (i < lines.length) {
    const match = LIST_ITEM.exec(lines[i]);
    if (!match || match[1].length !== indent || /\d/.test(match[2]) !== ordered)
      break;

    // Continuation lines are the ones indented past the marker, plus blank lines between them.
    const contentIndent = indent + match[2].length + 1;
    const body = [match[3]];
    i += 1;
    while (i < lines.length) {
      const line = lines[i];
      if (line.trim() && indentOf(line) <= indent) break;
      if (!line.trim()) {
        const following = lines.slice(i + 1).find((next) => next.trim());
        if (following === undefined || indentOf(following) <= indent) break;
      }
      body.push(line.slice(Math.min(indentOf(line), contentIndent)));
      i += 1;
    }

    const task = TASK.exec(body[0]);
    if (task) body[0] = body[0].slice(task[0].length);
    items.push({
      ...(task ? { checked: task[1] !== " " } : {}),
      children: parseBlocks(body),
    });
    while (i < lines.length && !lines[i].trim()) i += 1;
  }

  return {
    block: {
      type: "list",
      ordered,
      start: ordered ? Number.parseInt(first[2], 10) : 1,
      items,
    },
    end: i,
  };
}

// Numbered groups only: Hermes, the engine of Paseo's iOS and Android apps, leaves `match.groups`
// undefined for named groups. Group numbers are noted on each alternative.
const INLINE = new RegExp(
  [
    /\\([\\`*_{}[\]()#+\-.!~>|])/.source, // 1 escaped character
    /(`+)([\s\S]+?)\2/.source, // 2 backticks, 3 code
    /\[([^\]]+)\]\(([^)\s]+)\)/.source, // 4 label, 5 href
    /(https?:\/\/[^\s<>()]*[^\s<>().,;:!?'"*_~])/.source, // 6 bare URL
    /\*\*([\s\S]+?)\*\*/.source, // 7 strong
    /__([\s\S]+?)__/.source, // 8 strong
    /~~([\s\S]+?)~~/.source, // 9 strikethrough
    /\*([^\s*](?:[^*]*[^\s*])?)\*/.source, // 10 em
    /\b_([^\s_](?:[^_]*[^\s_])?)_\b/.source, // 11 em
  ].join("|"),
);

export function parseInline(text: string): Inline[] {
  const nodes: Inline[] = [];
  const pushText = (value: string) => {
    if (!value) return;
    const last = nodes[nodes.length - 1];
    if (last?.type === "text") last.text += value;
    else nodes.push({ type: "text", text: value });
  };

  // A fresh global regex per call: the recursion below would otherwise reset a shared lastIndex.
  const pattern = new RegExp(INLINE.source, "g");
  let position = 0;
  for (let match = pattern.exec(text); match; match = pattern.exec(text)) {
    const [
      whole,
      escaped,
      ,
      code,
      label,
      href,
      url,
      strong,
      strong2,
      del,
      em,
      em2,
    ] = match;
    pushText(text.slice(position, match.index));
    position = match.index + whole.length;

    if (escaped !== undefined) pushText(escaped);
    else if (code !== undefined)
      nodes.push({ type: "code", text: code.trim() || code });
    else if (href !== undefined)
      nodes.push({ type: "link", href, children: parseInline(label) });
    else if (url !== undefined)
      nodes.push({
        type: "link",
        href: url,
        children: [{ type: "text", text: url }],
      });
    else if (strong !== undefined || strong2 !== undefined) {
      nodes.push({ type: "strong", children: parseInline(strong ?? strong2) });
    } else if (del !== undefined)
      nodes.push({ type: "del", children: parseInline(del) });
    else if (em !== undefined || em2 !== undefined) {
      nodes.push({ type: "em", children: parseInline(em ?? em2) });
    } else pushText(whole);
  }
  pushText(text.slice(position));
  return nodes;
}
