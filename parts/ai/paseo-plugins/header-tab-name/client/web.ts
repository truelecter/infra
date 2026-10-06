// Everything that touches the DOM. Paseo's plugin API has no slot in the workspace header and does
// not expose which tab is open, so on web and desktop this module reads the selected tab from the
// tabs row and writes its name into the header next to the workspace title:
//
// - Each header title (`workspace-header-title`) belongs to the nearest ancestor that also holds a
//   tabs row (`workspace-tabs-row`). Its selected chips (`aria-selected="true"`) are one per pane.
//   The Explorer sidebar (`workspace-explorer-sidebar`) draws the same tabs row since Paseo 0.11;
//   its chips are skipped, so its Files or Changes tab never names the header.
// - The focused pane's chip is the one filled with `surface2`; Paseo gives the selected chip of an
//   unfocused pane `surface1`. A hidden probe resolves the theme variable to compare against.
// - The name goes into a node of ours appended to the title's flex row. React tolerates extra
//   siblings; it only moves and removes its own nodes.
//
// A MutationObserver re-applies this after Paseo re-renders. Every write is skipped when the DOM
// already has the value, so our own changes settle after one pass.

import { Platform } from "react-native";
import { pickTabName, type SelectedTab } from "./pick.ts";

// Plugins typecheck without the DOM library. Declare only what this module uses.
interface Style {
  backgroundColor: string;
}
interface El {
  className: string;
  textContent: string | null;
  readonly isConnected: boolean;
  readonly parentElement: El | null;
  readonly lastElementChild: El | null;
  readonly style: Style;
  appendChild(node: El): unknown;
  remove(): void;
  setAttribute(name: string, value: string): void;
  getAttribute(name: string): string | null;
  querySelector(selector: string): El | null;
  querySelectorAll(selector: string): ArrayLike<El>;
  closest(selector: string): El | null;
}
declare const document: {
  readonly head: El;
  readonly body: El;
  createElement(tagName: string): El;
  querySelectorAll(selector: string): ArrayLike<El>;
};
declare const window: {
  getComputedStyle(node: El): { readonly backgroundColor: string };
  requestAnimationFrame(callback: () => void): number;
  cancelAnimationFrame(handle: number): void;
};
declare class MutationObserver {
  constructor(callback: () => void);
  observe(
    target: unknown,
    options: {
      childList: boolean;
      subtree: boolean;
      characterData: boolean;
      attributes: boolean;
      attributeFilter: string[];
    },
  ): void;
  disconnect(): void;
}

const PLUGIN_ID = "header-tab-name";
const TITLE = '[data-testid="workspace-header-title"]';
const TABS_ROW = '[data-testid="workspace-tabs-row"]';
const SELECTED_TAB = `${TABS_ROW} [data-testid^="workspace-tab-"][aria-selected="true"]`;
const EXPLORER = '[data-testid="workspace-explorer-sidebar"]';
const SEPARATOR = "\u203a";

// The row is Paseo's title group: a flex row on wide layouts with an 8px gap. Only wide layouts
// have tab chips, so the compact column layout never gets a name.
const CSS = `
.htn-tab {
  display: flex; flex-direction: row; align-items: center; gap: 8px;
  min-width: 0; flex-shrink: 1; overflow: hidden;
}
.htn-sep { flex-shrink: 0; color: var(--colors-foreground-extra-muted, currentColor); }
.htn-tab > .htn-label { min-width: 0; flex-shrink: 1; }
`;

function element(tagName: string, className: string): El {
  const node = document.createElement(tagName);
  node.className = className;
  node.setAttribute("data-paseo-plugin", PLUGIN_ID);
  return node;
}

function setText(node: El, text: string) {
  if (node.textContent !== text) node.textContent = text;
}

/** The closest ancestor of the title that also holds the screen's tabs row. */
function screenOf(title: El): El | null {
  for (let node = title.parentElement; node; node = node.parentElement) {
    if (node.querySelector(TABS_ROW)) return node;
  }
  return null;
}

export interface HeaderTabName {
  stop(): void;
}

export function startHeaderTabName(): HeaderTabName | null {
  if (Platform.OS !== "web") return null;

  const style = element("style", "");
  style.textContent = CSS;
  document.head.appendChild(style);

  // Paseo's tabs fill the focused pane's chip with surface2. Hidden but still styled, so its
  // computed color follows theme switches.
  const probe = element("div", "");
  probe.setAttribute("hidden", "");
  probe.style.backgroundColor = "var(--colors-surface2)";
  document.body.appendChild(probe);

  let frame = 0;
  let stopped = false;

  function selectedTabs(screen: El): SelectedTab[] {
    const focusedColor = window.getComputedStyle(probe).backgroundColor;
    const chips = screen.querySelectorAll(SELECTED_TAB);
    const tabs: SelectedTab[] = [];
    for (let index = 0; index < chips.length; index++) {
      const chip = chips[index];
      if (chip.closest(EXPLORER)) continue;
      tabs.push({
        label: chip.textContent ?? "",
        focused: window.getComputedStyle(chip).backgroundColor === focusedColor,
      });
    }
    return tabs;
  }

  function apply() {
    if (stopped) return;
    if (!style.isConnected) document.head.appendChild(style);
    if (!probe.isConnected) document.body.appendChild(probe);

    const kept = new Set<El>();
    const titles = document.querySelectorAll(TITLE);
    for (let index = 0; index < titles.length; index++) {
      const title = titles[index];
      const row = title.parentElement;
      const screen = screenOf(title);
      if (!row || !screen) continue;
      const name = pickTabName(selectedTabs(screen), title.textContent ?? "");
      if (!name) continue;

      let wrapper = row.querySelector(":scope > .htn-tab");
      if (!wrapper) {
        wrapper = element("div", "htn-tab");
        const separator = element("div", "htn-sep");
        separator.textContent = SEPARATOR;
        wrapper.appendChild(separator);
        wrapper.appendChild(element("div", "htn-label"));
      }
      // React appends late children (the project row) after ours; keep the name last.
      if (row.lastElementChild !== wrapper) row.appendChild(wrapper);

      const label = wrapper.querySelector(".htn-label");
      if (label) {
        // Borrow the title's typography (font, size, color, one-line ellipsis) from its classes.
        const className = `${title.className} htn-label`;
        if (label.className !== className) label.className = className;
        if (label.getAttribute("title") !== name) label.setAttribute("title", name);
        setText(label, name);
      }
      kept.add(wrapper);
    }

    const wrappers = document.querySelectorAll(".htn-tab");
    for (let index = 0; index < wrappers.length; index++) {
      if (!kept.has(wrappers[index])) wrappers[index].remove();
    }
  }

  function schedule() {
    if (frame || stopped) return;
    frame = window.requestAnimationFrame(() => {
      frame = 0;
      apply();
    });
  }

  // Pane focus shows up only as a class change on the chips, so watch classes as well as
  // selection, text, and structure. Passes are coalesced to one per frame.
  const observer = new MutationObserver(schedule);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["class", "aria-selected"],
  });
  schedule();

  return {
    stop() {
      stopped = true;
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
      const wrappers = document.querySelectorAll(".htn-tab");
      for (let index = 0; index < wrappers.length; index++) wrappers[index].remove();
      probe.remove();
      style.remove();
    },
  };
}
