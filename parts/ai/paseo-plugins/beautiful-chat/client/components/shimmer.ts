import type { ViewProps } from "react-native";

const STYLE_ELEMENT_ID = "beautiful-chat-shimmer";

/**
 * A sweeping highlight for a row that is still working.
 *
 * React Native has no gradient primitive, so an Animated band is a hard-edged
 * rectangle: a screenshot catches it as a grey box sitting on the text. A CSS
 * gradient has soft edges by construction, so the sweep is declared once as a
 * real rule and matched by attribute — the same technique the frosted surface
 * uses, and the same reason.
 *
 * Off web the attribute is ignored and the row simply does not shimmer. The
 * breathing rail beside it already carries the "working" signal there.
 */
const SHIMMER_RULE = `@keyframes bcshimmer {
  from { background-position: 240% 0; }
  to { background-position: -140% 0; }
}
[data-bcshimmer] {
  background-image: linear-gradient(
    100deg,
    transparent 30%,
    rgba(255, 255, 255, 0.055) 48%,
    rgba(255, 255, 255, 0.085) 52%,
    transparent 70%
  );
  background-size: 220% 100%;
  background-repeat: no-repeat;
  animation: bcshimmer 4.8s linear infinite;
}
@media (prefers-reduced-motion: reduce) {
  [data-bcshimmer] { animation: none; background-image: none; }
}`;

/** Installs the sweep. A no-op off web, and idempotent across client mounts. */
export function installShimmer(): () => void {
  if (typeof document === "undefined") return () => {};
  if (document.getElementById(STYLE_ELEMENT_ID)) return () => {};

  const style = document.createElement("style");
  style.id = STYLE_ELEMENT_ID;
  style.textContent = SHIMMER_RULE;
  document.head.appendChild(style);

  return () => {
    style.remove();
  };
}

/** Spread onto the row that is working. Remove it and the sweep stops. */
export const shimmering = { dataSet: { bcshimmer: true } } as unknown as ViewProps;
