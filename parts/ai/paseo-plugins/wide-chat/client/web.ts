import { Platform } from "react-native";
import type { ChatWidth } from "../shared/settings.ts";
import { buildOverrideCss, collectSelectors, type RuleLike } from "./css.ts";

// Plugins typecheck without the DOM library. Declare only what this module uses.
interface StyleElement {
  textContent: string | null;
  setAttribute(name: string, value: string): void;
  remove(): void;
}
interface StyleSheetLike {
  readonly ownerNode: unknown;
  readonly cssRules: ArrayLike<RuleLike>;
}
interface MutationRecordLike {
  readonly target: unknown;
}
declare const document: {
  readonly documentElement: unknown;
  readonly head: { appendChild(node: StyleElement): unknown };
  readonly styleSheets: ArrayLike<StyleSheetLike>;
  createElement(tagName: "style"): StyleElement;
};
declare const window: {
  addEventListener(type: "focus", listener: () => void): void;
  removeEventListener(type: "focus", listener: () => void): void;
};
declare class MutationObserver {
  constructor(callback: (records: MutationRecordLike[]) => void);
  observe(
    target: unknown,
    options: { childList: boolean; subtree: boolean },
  ): void;
  disconnect(): void;
}

export interface ChatWidener {
  apply(width: ChatWidth): void;
  stop(): void;
}

function ruleCount(sheet: StyleSheetLike): number {
  try {
    return sheet.cssRules.length;
  } catch {
    // Cross-origin sheets refuse CSSOM access.
    return -1;
  }
}

// Paseo styles are generated at runtime: Unistyles rewrites its <style> tag with hashed class
// names, and React Native Web inserts atomic rules as components first render. Find the
// 820px rules wherever they are and override them from a sheet of our own.
export function startChatWidener(): ChatWidener | null {
  if (Platform.OS !== "web") return null;

  const style = document.createElement("style");
  style.setAttribute("data-paseo-plugin", "wide-chat");
  document.head.appendChild(style);

  let width: ChatWidth | null = null;
  let selectors = new Set<string>();
  let seen: { sheet: StyleSheetLike; rules: number }[] = [];

  function render() {
    const css = width ? buildOverrideCss(selectors, width) : "";
    if (style.textContent !== css) style.textContent = css;
  }

  function paseoSheets(): StyleSheetLike[] {
    const sheets: StyleSheetLike[] = [];
    for (let index = 0; index < document.styleSheets.length; index++) {
      const sheet = document.styleSheets[index];
      if (sheet.ownerNode !== style) sheets.push(sheet);
    }
    return sheets;
  }

  // A changed sheet is either a new object (Unistyles replaced its text) or a new rule count.
  function sheetsChanged(): boolean {
    const sheets = paseoSheets();
    if (sheets.length !== seen.length) return true;
    return sheets.some(
      (sheet, index) =>
        sheet !== seen[index].sheet || ruleCount(sheet) !== seen[index].rules,
    );
  }

  function scan() {
    const next = new Set<string>();
    seen = paseoSheets().map((sheet) => {
      try {
        collectSelectors(sheet.cssRules, next);
      } catch {
        // Cross-origin sheets refuse CSSOM access.
      }
      return { sheet, rules: ruleCount(sheet) };
    });
    selectors = next;
    render();
  }

  // Runs as a microtask after each DOM commit, before paint, so new rules never flash narrow.
  const observer = new MutationObserver((records) => {
    if (records.every((record) => record.target === style)) return;
    if (sheetsChanged()) scan();
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  scan();

  return {
    apply(next) {
      width = next;
      if (sheetsChanged()) scan();
      else render();
    },
    stop() {
      observer.disconnect();
      style.remove();
    },
  };
}

export function onWindowFocus(listener: () => void): () => void {
  if (Platform.OS !== "web") return () => {};
  window.addEventListener("focus", listener);
  return () => window.removeEventListener("focus", listener);
}
