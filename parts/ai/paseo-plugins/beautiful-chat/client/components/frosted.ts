import type { ViewProps } from "react-native";

const STYLE_ELEMENT_ID = "beautiful-chat-frosted";

/**
 * `backdrop-filter` has no React Native style equivalent, and React Native Web
 * drops style keys it does not recognise. So the blur is declared once as a
 * real CSS rule and matched by attribute, the same technique the host itself
 * uses for `data-pmono`.
 *
 * `saturate` is included because blurring alone washes colour out of whatever
 * sits behind the surface; pushing saturation back up keeps syntax highlighting
 * under a nested block from turning grey.
 */
const FROSTED_RULE = `[data-ompfrost] {
  -webkit-backdrop-filter: blur(14px) saturate(150%);
  backdrop-filter: blur(14px) saturate(150%);
}`;

/**
 * Installs the blur rule. A no-op off web, and idempotent so a second client
 * mount reuses the existing element.
 */
export function installFrostedGlass(): () => void {
  if (typeof document === "undefined") return () => {};
  if (document.getElementById(STYLE_ELEMENT_ID)) return () => {};

  const style = document.createElement("style");
  style.id = STYLE_ELEMENT_ID;
  style.textContent = FROSTED_RULE;
  document.head.appendChild(style);

  return () => {
    style.remove();
  };
}

/**
 * Marks a surface for blurring. Spread onto a `View` whose background is one of
 * the translucent `glass` tokens — an opaque background has nothing to show
 * through and the blur would be invisible.
 *
 * On native the attribute is ignored and the surface simply renders
 * translucent, which degrades honestly: a real blur there needs a native view
 * the plugin sandbox does not expose.
 */
export const frosted = {
  dataSet: { ompfrost: true },
} as unknown as ViewProps;
