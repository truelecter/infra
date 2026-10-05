import { useEffect } from "react";
import { Platform } from "react-native";
import type { TextProps, ViewProps } from "react-native";
import { copyText } from "@getpaseo/plugin/client/react-native";
import { radius } from "./theme-tokens";
import type { ExtendedThemeTokens } from "./theme-tokens";

/**
 * A floating Copy / Add to chat bar for highlighted callout text.
 *
 * The bar is raw DOM rather than a React tree because it has to escape the
 * timeline: the chat surface clips its content and the host translates it while
 * the keyboard moves, so an in-tree overlay is either cut off or dragged along.
 * The plugin sandbox exposes no portal — `react-dom` is not a module a plugin
 * may import — so the bar is parked on `document.body` and driven by selection
 * events.
 *
 * It lives in a shadow root. The host app ships its own global rules and a
 * React Native Web reset, and a bar in the light DOM inherits whatever those
 * say about font size, line height, and flex shrinking — which is how the first
 * version ended up with two labels sitting on top of each other on desktop.
 * `all: initial` on the shadow host stops inheritance at the boundary, and the
 * bar's own rules are the only ones inside it.
 *
 * Web only. iOS and Android route selection through the platform's own menu,
 * which a plugin cannot extend; `selectable` text there already offers Copy.
 */

/** Marks a callout root as a surface whose selections get the bar. */
export const selectionSurface = { dataSet: { bcselection: true } } as unknown as ViewProps;

/**
 * Marks a code or terminal body inside a surface. A selection from one is
 * quoted as a fenced block, because `>` in front of every line of code makes it
 * unreadable to the next reader and to the model.
 */
export const selectionCodeSurface = { dataSet: { bccode: true } } as unknown as ViewProps;

/**
 * The same mark for a code or terminal body that is a `Text` rather than a
 * `View` — React Native types the two prop bags separately, and the DOM
 * attribute is identical.
 */
export const selectionCodeText = { dataSet: { bccode: true } } as unknown as TextProps;

const SURFACE_SELECTOR = "[data-bcselection]";
const CODE_SELECTOR = "[data-bccode]";
/** The host composer input carries `dataSet={{ composerInput: "" }}`. */
const COMPOSER_SELECTOR = "[data-composer-input]";

const GAP = 8;
const RESET_LABEL_MS = 1400;

interface Snapshot {
  text: string;
  isCode: boolean;
  rect: DOMRect;
}

function elementOf(node: Node | null): HTMLElement | null {
  if (!node) return null;
  return node.nodeType === Node.ELEMENT_NODE ? (node as HTMLElement) : node.parentElement;
}

/**
 * The live selection, or null when it is empty, collapsed, or outside every
 * plugin surface. Both ends must sit in the same surface: a drag that runs from
 * a callout into host chrome is not a callout selection.
 */
function readSelection(): Snapshot | null {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null;

  const text = selection.toString().trim();
  if (!text) return null;

  const anchor = elementOf(selection.anchorNode)?.closest(SURFACE_SELECTOR);
  const focus = elementOf(selection.focusNode)?.closest(SURFACE_SELECTOR);
  if (!anchor || anchor !== focus) return null;

  const range = selection.getRangeAt(0);
  const rects = range.getClientRects();
  const rect = rects.length > 0 ? rects[0] : range.getBoundingClientRect();
  if (!rect || (rect.width === 0 && rect.height === 0)) return null;

  const isCode = Boolean(elementOf(range.commonAncestorContainer)?.closest(CODE_SELECTOR));
  return { text, isCode, rect };
}

/** Markdown the composer can carry: a fence for code, a blockquote for prose. */
function quote(snapshot: Snapshot): string {
  if (snapshot.isCode) return "```\n" + snapshot.text + "\n```\n\n";
  return (
    snapshot.text
      .split("\n")
      .map((line) => (line.trim() ? "> " + line : ">"))
      .join("\n") + "\n\n"
  );
}

function composerInput(): HTMLTextAreaElement | HTMLInputElement | null {
  const marked = document.querySelector(COMPOSER_SELECTOR);
  if (!marked) return null;
  if (marked instanceof HTMLTextAreaElement || marked instanceof HTMLInputElement) return marked;
  return marked.querySelector("textarea, input");
}

/**
 * Writes the snippet into the composer at the caret and reports whether it
 * landed.
 *
 * `insertText` is the first choice because it goes through the browser's own
 * editing path: the composer is an uncontrolled input that publishes its value
 * through React's change handler, and a real edit is what that handler listens
 * for. Assigning `.value` moves the pixels only, so the draft the host would
 * send stays behind — hence the native setter plus a bubbling `input` event as
 * the fallback, and a value check before either path claims success.
 */
function insertIntoComposer(snippet: string): boolean {
  const input = composerInput();
  if (!input) return false;

  const before = input.value;
  const start = input.selectionStart ?? before.length;
  const end = input.selectionEnd ?? start;
  const head = before.slice(0, start);
  // A quote needs a blank line above it or the previous paragraph absorbs it.
  const lead =
    head.length === 0 || head.endsWith("\n\n") ? "" : head.endsWith("\n") ? "\n" : "\n\n";
  const insert = lead + snippet;
  const next = head + insert + before.slice(end);
  const caret = head.length + insert.length;

  input.focus();
  input.setSelectionRange(start, end);
  if (document.execCommand("insertText", false, insert) && input.value === next) {
    input.setSelectionRange(caret, caret);
    return true;
  }

  const prototype =
    input instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const setValue = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
  if (!setValue) return false;

  setValue.call(input, next);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  if (input.value !== next) return false;
  input.setSelectionRange(caret, caret);
  return true;
}

const BAR_CSS = `
:host { all: initial; }
.bar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border-style: solid;
  border-width: 1px;
  border-radius: ${radius.block}px;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.38);
  font-size: 12px;
  line-height: 16px;
  user-select: none;
  -webkit-user-select: none;
}
.btn {
  appearance: none;
  margin: 0;
  border: 0;
  background: transparent;
  border-radius: ${radius.chip}px;
  cursor: pointer;
  font: inherit;
  font-weight: 500;
  letter-spacing: 0.1px;
  padding: 4px 9px;
  white-space: nowrap;
  /* No shrinking: a squeezed button overlaps its neighbour's label. */
  flex: 0 0 auto;
}
`;

interface Bar {
  host: HTMLDivElement;
  setTheme(tokens: ExtendedThemeTokens): void;
  show(rect: DOMRect): void;
  hide(): void;
  dispose(): void;
}

function createBar(): Bar {
  const host = document.createElement("div");
  host.setAttribute("data-bcselectionbar", "");
  // Host-app rules can match a bare `div`, so the placement properties are set
  // as important; everything else lives inside the shadow root.
  const placement: Array<[string, string]> = [
    ["position", "fixed"],
    ["top", "0"],
    ["left", "0"],
    ["z-index", "2147483000"],
    ["display", "none"],
    ["margin", "0"],
    ["padding", "0"],
  ];
  for (const [property, value] of placement) {
    host.style.setProperty(property, value, "important");
  }

  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = BAR_CSS;
  shadow.appendChild(style);

  const bar = document.createElement("div");
  bar.className = "bar";
  shadow.appendChild(bar);

  let labelTimer = 0;
  let hoverColor = "";

  const makeButton = (label: string, onPress: (button: HTMLButtonElement) => void) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn";
    button.textContent = label;
    button.dataset.label = label;
    button.addEventListener("click", () => onPress(button));
    button.addEventListener("mouseenter", () => {
      button.style.backgroundColor = hoverColor;
    });
    button.addEventListener("mouseleave", () => {
      button.style.backgroundColor = "transparent";
    });
    bar.appendChild(button);
    return button;
  };

  const flash = (button: HTMLButtonElement, label: string) => {
    button.textContent = label;
    window.clearTimeout(labelTimer);
    labelTimer = window.setTimeout(() => {
      for (const candidate of [copyButton, addButton]) {
        candidate.textContent = candidate.dataset.label ?? "";
      }
    }, RESET_LABEL_MS);
  };

  const copyButton = makeButton("Copy", (button) => {
    const snapshot = readSelection();
    if (!snapshot) return;
    void copyText(snapshot.text);
    flash(button, "Copied");
  });

  const addButton = makeButton("Add to chat", (button) => {
    const snapshot = readSelection();
    if (!snapshot) return;
    if (insertIntoComposer(quote(snapshot))) {
      flash(button, "Added");
      return;
    }
    // No composer on screen — the snippet still reaches the clipboard, and the
    // label says which of the two actions actually happened.
    void copyText(snapshot.text);
    flash(button, "Copied instead");
  });

  // The bar keeps the selection alive: a press inside it must not move the
  // caret, or `window.getSelection()` is empty by the time the click lands.
  const holdSelection = (event: MouseEvent) => event.preventDefault();
  bar.addEventListener("mousedown", holdSelection);

  document.body.appendChild(host);

  return {
    host,
    setTheme(tokens) {
      hoverColor = tokens.accentBg;
      // Every derived surface token is translucent by design — they sit on the
      // host background inside the timeline. A bar floating over text needs to
      // be opaque, so the raised tone is painted as a layer on the one opaque
      // surface the theme carries.
      bar.style.backgroundColor = tokens.surface0;
      bar.style.backgroundImage = `linear-gradient(${tokens.surface2}, ${tokens.surface2})`;
      bar.style.borderColor = tokens.border;
      bar.style.fontFamily = tokens.fontUi;
      copyButton.style.color = tokens.foreground;
      addButton.style.color = tokens.accent;
    },
    show(rect) {
      host.style.setProperty("display", "block", "important");
      // Measure once visible, then clamp inside the viewport. Above the
      // selection by default: below it covers the next line of output.
      const width = bar.offsetWidth;
      const height = bar.offsetHeight;
      const left = Math.min(
        Math.max(GAP, rect.left + rect.width / 2 - width / 2),
        Math.max(GAP, window.innerWidth - width - GAP),
      );
      const above = rect.top - height - GAP;
      const top =
        above >= GAP ? above : Math.min(rect.bottom + GAP, window.innerHeight - height - GAP);
      host.style.setProperty("left", `${Math.round(left)}px`, "important");
      host.style.setProperty("top", `${Math.round(top)}px`, "important");
    },
    hide() {
      host.style.setProperty("display", "none", "important");
    },
    dispose() {
      window.clearTimeout(labelTimer);
      bar.removeEventListener("mousedown", holdSelection);
      host.remove();
    },
  };
}

interface Controller {
  bar: Bar;
  refs: number;
  dispose(): void;
}

let controller: Controller | null = null;

function startController(): Controller {
  const bar = createBar();
  let pending = 0;

  const sync = () => {
    pending = 0;
    const snapshot = readSelection();
    if (!snapshot) {
      bar.hide();
      return;
    }
    bar.show(snapshot.rect);
  };

  // Selection events fire per character during a drag, so they coalesce to the
  // next tick. A timer rather than a frame: an occluded or backgrounded window
  // never runs `requestAnimationFrame`, and the bar would be stuck.
  const schedule = () => {
    if (pending !== 0) return;
    pending = window.setTimeout(sync, 0);
  };

  const onPointerDown = (event: Event) => {
    const target = event.target;
    // Events from inside the shadow root are retargeted to the host, so a press
    // on a button reads as a press on the bar and leaves it open.
    if (target instanceof Node && bar.host.contains(target)) return;
    bar.hide();
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") bar.hide();
  };

  document.addEventListener("selectionchange", schedule);
  document.addEventListener("pointerdown", onPointerDown, true);
  document.addEventListener("keydown", onKeyDown, true);
  // A scrolled selection keeps its document position but changes its viewport
  // position, so the bar follows it rather than floating over stale pixels.
  window.addEventListener("scroll", schedule, true);
  window.addEventListener("resize", schedule);

  return {
    bar,
    refs: 0,
    dispose() {
      window.clearTimeout(pending);
      document.removeEventListener("selectionchange", schedule);
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      bar.dispose();
    },
  };
}

/**
 * Keeps one bar alive for as long as at least one enhanced callout is mounted,
 * and feeds it the live theme. Call it from every renderer: the bar is shared,
 * so the calls are reference counts rather than instances.
 */
export function useSelectionActions(tokens: ExtendedThemeTokens, enabled: boolean): void {
  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined" || !enabled) return;
    const active = controller ?? (controller = startController());
    active.refs += 1;
    return () => {
      active.refs -= 1;
      if (active.refs > 0) return;
      active.dispose();
      if (controller === active) controller = null;
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    controller?.bar.setTheme(tokens);
  }, [tokens, enabled]);
}
