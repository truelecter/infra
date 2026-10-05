const STYLE_ELEMENT_ID = "beautiful-chat-host-notice";

/**
 * The three background colours the host's `Notification` row uses, one per
 * level (`components/message.tsx:2127-2137`). They are literals in the host's
 * own stylesheet, not theme tokens, which is what makes them findable.
 */
const LEVEL_COLORS = [
  { level: "info", rgb: "147, 197, 253" },
  { level: "warning", rgb: "245, 158, 11" },
  { level: "error", rgb: "239, 68, 68" },
] as const;

/**
 * Gives the host's own background-job notice the plugin's chrome.
 *
 * `notification` is not in the host's allow-list of transformable item types
 * on Paseo 0.8 — a transformer registered for it throws inside `contribute` —
 * so this row is drawn by the host and cannot be replaced. It arrives as a
 * tinted rectangle with no border and a small radius, which reads as a
 * different product beside every card this plugin draws.
 *
 * What is reachable is its class. React Native Web compiles each declaration
 * to one atomic class, so the row's background colour has a class of its own,
 * and the colour is a literal the host wrote by hand. This reads that class
 * out of the live stylesheet rather than guessing the hash, then adds the
 * border, radius and shadow the plugin's cards use.
 *
 * Off web there is no CSSOM and this is a no-op: the native row keeps the
 * host's styling, which is the honest outcome rather than a half-applied one.
 */
function findColorClasses(): Map<string, string> {
  const found = new Map<string, string>();

  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      // A cross-origin sheet cannot be read; the host's own styles can.
      continue;
    }
    for (const rule of Array.from(rules)) {
      if (!(rule instanceof CSSStyleRule)) continue;
      const background = rule.style.backgroundColor.replace(/\s+/g, " ");
      for (const { level, rgb } of LEVEL_COLORS) {
        if (found.has(level)) continue;
        // The browser normalises the literal to `rgba(147, 197, 253, 0.1)`.
        if (background.includes(`rgba(${rgb}`)) {
          const selector = rule.selectorText.trim();
          if (selector.startsWith(".") && !selector.includes(" ")) found.set(level, selector);
        }
      }
    }
  }

  return found;
}

/** The same border, radius and shadow every card in this plugin carries. */
function ruleFor(selector: string, rgb: string): string {
  return `${selector} {
  border-radius: 12px;
  border: 1px solid rgba(${rgb}, 0.22);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.12);
}`;
}

export function installHostNoticeStyle(): () => void {
  if (typeof document === "undefined") return () => {};
  if (document.getElementById(STYLE_ELEMENT_ID)) return () => {};

  const classes = findColorClasses();
  if (classes.size === 0) return () => {};

  const rules: string[] = [];
  for (const { level, rgb } of LEVEL_COLORS) {
    const selector = classes.get(level);
    if (selector) rules.push(ruleFor(selector, rgb));
  }

  const style = document.createElement("style");
  style.id = STYLE_ELEMENT_ID;
  style.textContent = rules.join("\n");
  document.head.appendChild(style);

  return () => {
    style.remove();
  };
}
