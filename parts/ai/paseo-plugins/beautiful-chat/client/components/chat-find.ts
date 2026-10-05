import { getEnhancerPreferences } from "../preferences";

const STYLE_ELEMENT_ID = "beautiful-chat-find-style";
const BAR_ID = "beautiful-chat-find";
const MATCHES = "beautiful-chat-find";
const CURRENT = "beautiful-chat-find-current";
const CHAT = '[data-testid="agent-chat-scroll"]';
const IGNORED =
  'button, [role="button"], [aria-hidden="true"], input, textarea, svg, script, style';
const BLOCK = "div, p, li, td, th, pre, h1, h2, h3, h4, h5, h6";

const FIND_RULES = `::highlight(${MATCHES}) {
  background-color: rgb(250 204 21 / 0.35);
}
::highlight(${CURRENT}) {
  background-color: rgb(250 204 21);
  color: #111;
}
#${BAR_ID} {
  position: fixed;
  z-index: 2147483000;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 6px;
  border-radius: 8px;
  border: 1px solid rgb(127 127 127 / 0.35);
  box-shadow: 0 6px 20px rgb(0 0 0 / 0.25);
  font: 13px var(--paseo-ui-font, system-ui, sans-serif);
}
#${BAR_ID}[hidden] {
  display: none;
}
#${BAR_ID} input {
  width: 180px;
  padding: 3px 6px;
  border: 1px solid rgb(127 127 127 / 0.45);
  border-radius: 5px;
  background: transparent;
  color: inherit;
  font: inherit;
  outline: none;
}
#${BAR_ID} span {
  min-width: 64px;
  text-align: center;
  opacity: 0.75;
  font-variant-numeric: tabular-nums;
}
#${BAR_ID} button {
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
}
#${BAR_ID} button:hover {
  background: rgb(127 127 127 / 0.2);
}`;

/** Retained panels stay mounted while hidden; only a rendered chat counts. */
function isVisible(element: Element): boolean {
  return element.getClientRects().length > 0;
}

function visibleChats(root: ParentNode): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(CHAT)).filter(isVisible);
}

/**
 * The chat that owns `node`. The composer sits beside the scroll area, not
 * inside it, so the walk climbs until an ancestor holds exactly one visible
 * chat. An ancestor holding several means `node` is outside any one pane.
 */
function chatFor(node: EventTarget | null): HTMLElement | null {
  let element: Element | null = node instanceof Node ? node.parentElement : null;
  if (node instanceof Element) element = node;
  for (; element; element = element.parentElement) {
    if (element.matches(CHAT)) return isVisible(element) ? (element as HTMLElement) : null;
    const chats = visibleChats(element);
    if (chats.length === 1) return chats[0] ?? null;
    if (chats.length > 1) return null;
  }
  return null;
}

/**
 * Readable text over `background`. The chat container's own `color` is the
 * browser default, not the theme, because the host sets colour on each text
 * element instead.
 */
function foregroundFor(background: string): string {
  const [red = 0, green = 0, blue = 0] = (background.match(/\d+(\.\d+)?/g) ?? []).map(Number);
  // Relative luminance weights (ITU-R BT.709).
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue > 140 ? "#1a1a1a" : "#f2f2f2";
}

/** The first painted background behind `element`, so the bar matches the theme. */
function backgroundOf(element: Element | null): string {
  for (; element; element = element.parentElement) {
    const color = getComputedStyle(element).backgroundColor;
    if (color && color !== "transparent" && !/rgba\(.*,\s*0\)$/.test(color)) return color;
  }
  return "Canvas";
}

/**
 * Every rendered occurrence of `query` inside `chat`, in reading order.
 * Text is joined per block before matching, so a phrase that crosses a bold
 * or code span inside one paragraph still matches.
 */
function findMatches(chat: HTMLElement, query: string): Range[] {
  const words = query.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const pattern = new RegExp(
    words.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("\\s+"),
    "giu",
  );

  const groups = new Map<Element, Text[]>();
  const walker = document.createTreeWalker(chat, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const parent = node.parentElement;
    if (!(node instanceof Text) || !parent || !node.data.trim()) continue;
    if (parent.closest(IGNORED) || !isVisible(parent)) continue;
    const block = parent.closest(BLOCK) ?? chat;
    const texts = groups.get(block) ?? [];
    texts.push(node);
    groups.set(block, texts);
  }

  const ranges: Range[] = [];
  for (const texts of groups.values()) {
    const points: { node: Text; start: number; end: number }[] = [];
    let text = "";
    for (const node of texts) {
      points.push({ node, start: text.length, end: text.length + node.data.length });
      text += node.data;
    }
    for (const match of text.matchAll(pattern)) {
      const endOffset = match.index + match[0].length;
      const start = points.find((point) => point.start <= match.index && point.end > match.index);
      const end = points.find((point) => point.start < endOffset && point.end >= endOffset);
      if (!start || !end) continue;
      const range = document.createRange();
      range.setStart(start.node, match.index - start.start);
      range.setEnd(end.node, endOffset - end.start);
      ranges.push(range);
    }
  }
  return ranges;
}

/**
 * Paseo's own chat find addresses rows by the host's message id, and a row
 * this plugin draws carries a plugin id instead, so the host can never reveal
 * a match inside one. This find bar searches what is rendered, whoever drew
 * it. The host list is windowed: history the chat has not loaded is not in
 * the page and is not searched.
 *
 * Ctrl/Cmd+F is taken only while the plugin replaces prompts or replies, and
 * only when the focused or last-clicked element belongs to one chat, or only one
 * chat is on screen; otherwise the key reaches the host untouched. A no-op off web and where the CSS Highlight API is missing.
 */
export function installChatFind(): () => void {
  if (typeof document === "undefined" || typeof CSS === "undefined" || !("highlights" in CSS)) {
    return () => {};
  }
  if (document.getElementById(STYLE_ELEMENT_ID)) return () => {};

  const style = document.createElement("style");
  style.id = STYLE_ELEMENT_ID;
  style.textContent = FIND_RULES;
  document.head.appendChild(style);

  let chat: HTMLElement | null = null;
  let ranges: Range[] = [];
  let current = -1;
  let lastTarget: EventTarget | null = null;

  const bar = document.createElement("div");
  bar.id = BAR_ID;
  bar.hidden = true;
  bar.setAttribute("role", "search");
  bar.title = "Searches the messages loaded in this chat";
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Find in chat";
  input.setAttribute("aria-label", "Find in chat");
  const count = document.createElement("span");
  count.setAttribute("aria-live", "polite");
  const controls: [string, string, () => void][] = [
    ["Previous match", "\u2191", () => step(-1)],
    ["Next match", "\u2193", () => step(1)],
    ["Close find", "\u2715", close],
  ];
  bar.append(
    input,
    count,
    ...controls.map(([label, glyph, onClick]) => {
      const element = document.createElement("button");
      element.type = "button";
      element.textContent = glyph;
      element.setAttribute("aria-label", label);
      element.title = label;
      element.addEventListener("click", onClick);
      return element;
    }),
  );
  document.body.appendChild(bar);

  function place() {
    if (!chat) return;
    const rect = chat.getBoundingClientRect();
    bar.style.top = `${Math.max(rect.top + 8, 8)}px`;
    bar.style.right = `${Math.max(window.innerWidth - rect.right + 16, 8)}px`;
    const background = backgroundOf(chat);
    bar.style.background = background;
    bar.style.color = foregroundFor(background);
  }

  function show() {
    CSS.highlights.set(MATCHES, new Highlight(...ranges));
    const active = ranges[current];
    if (active) CSS.highlights.set(CURRENT, new Highlight(active));
    else CSS.highlights.delete(CURRENT);
    if (!input.value.trim()) count.textContent = "";
    else if (ranges.length) count.textContent = `${current + 1} of ${ranges.length}`;
    else count.textContent = "No results";
    active?.startContainer.parentElement?.scrollIntoView({ block: "center" });
  }

  function search() {
    if (!chat?.isConnected) return close();
    ranges = findMatches(chat, input.value);
    // Start from the first match at or below the top of what is on screen.
    const top = chat.getBoundingClientRect().top;
    const first = ranges.findIndex((range) => range.getBoundingClientRect().bottom >= top);
    current = ranges.length ? Math.max(first, 0) : -1;
    show();
  }

  function step(direction: 1 | -1) {
    if (!chat?.isConnected) return close();
    // Rows mount, unmount and stream while the bar is open, so re-read the page
    // and continue from the same occurrence when it is still there.
    const previous = ranges[current];
    ranges = findMatches(chat, input.value);
    if (!ranges.length) {
      current = -1;
      return show();
    }
    const kept = previous
      ? ranges.findIndex(
          (range) =>
            range.startContainer === previous.startContainer &&
            range.startOffset === previous.startOffset,
        )
      : -1;
    const base = kept >= 0 ? kept : Math.min(current, ranges.length - 1);
    current = (base + direction + ranges.length) % ranges.length;
    show();
  }

  function close() {
    bar.hidden = true;
    chat = null;
    ranges = [];
    current = -1;
    CSS.highlights.delete(MATCHES);
    CSS.highlights.delete(CURRENT);
  }

  const onPointerDown = (event: PointerEvent) => {
    if (!bar.contains(event.target as Node)) lastTarget = event.target;
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key.toLowerCase() !== "f" || !(event.ctrlKey || event.metaKey)) return;
    if (event.altKey || event.shiftKey) return;
    // With both message replacements off, Paseo draws every prompt and reply and its own
    // find, which also searches unloaded history, reaches them.
    const { assistantMarkdown, enhancedUserBubble } = getEnhancerPreferences();
    if (!assistantMarkdown && !enhancedUserBubble) return;
    const onScreen = visibleChats(document);
    const target = bar.contains(document.activeElement)
      ? chat
      : (chatFor(document.activeElement) ??
        chatFor(lastTarget) ??
        (onScreen.length === 1 ? (onScreen[0] ?? null) : null));
    if (!target) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    chat = target;
    bar.hidden = false;
    place();
    input.focus();
    input.select();
    if (input.value.trim()) search();
  };

  const onInputKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Enter") step(event.shiftKey ? -1 : 1);
    else if (event.key === "Escape") close();
    else return;
    event.preventDefault();
    event.stopPropagation();
  };

  // Window capture runs before the host's document-level Ctrl+F handler.
  window.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("pointerdown", onPointerDown, true);
  window.addEventListener("resize", place);
  input.addEventListener("keydown", onInputKeyDown);
  input.addEventListener("input", search);

  return () => {
    close();
    window.removeEventListener("keydown", onKeyDown, true);
    window.removeEventListener("pointerdown", onPointerDown, true);
    window.removeEventListener("resize", place);
    bar.remove();
    style.remove();
  };
}
