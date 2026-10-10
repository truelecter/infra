import type { ChatWidth } from "../shared/settings.ts";

// Paseo's default chat width (DEFAULT_CONTENT_MAX_WIDTH, packages/app/src/styles/theme.ts). Every
// chat-column container — timeline rows, composer, task/subagent track, draft form — caps at
// `theme.contentMaxWidth`, which is this value unless Settings → Appearance → Content width is set.
export const STOCK_MAX_WIDTH = "820px";

// The slice of CSSOM that selector collection needs, so it runs without a DOM.
export interface RuleLike {
  readonly selectorText?: string;
  readonly style?: { getPropertyValue(property: string): string };
  readonly cssRules?: ArrayLike<RuleLike>;
}

export function collectSelectors(
  rules: ArrayLike<RuleLike>,
  into: Set<string> = new Set(),
): Set<string> {
  for (let index = 0; index < rules.length; index++) {
    const rule = rules[index];
    if (
      rule.selectorText &&
      rule.style?.getPropertyValue("max-width").trim() === STOCK_MAX_WIDTH
    ) {
      into.add(rule.selectorText);
    }
    // Media queries and other grouping rules nest their style rules.
    if (rule.cssRules) collectSelectors(rule.cssRules, into);
  }
  return into;
}

// Never narrower than stock, so narrow panes and splits look the same as without the plugin.
export function maxWidthValue({ percent, maxPx }: ChatWidth): string {
  const share = `${percent}%`;
  const bounded = maxPx > 0 ? `min(${share}, ${maxPx}px)` : share;
  return `max(${STOCK_MAX_WIDTH}, ${bounded})`;
}

export function buildOverrideCss(
  selectors: Iterable<string>,
  width: ChatWidth,
): string {
  const list = [...selectors].sort().join(",");
  if (!list) return "";
  // A capped container inside another one (the composer inside the draft form) fills its
  // parent instead of taking the percentage a second time.
  return (
    `:is(${list}){max-width:${maxWidthValue(width)}!important}` +
    `:is(${list}) :is(${list}){max-width:none!important}`
  );
}
