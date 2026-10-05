import type { ViewProps } from "react-native";

/**
 * Opts a subtree out of the host's global font rule.
 *
 * Paseo forces its own UI font onto everything it renders:
 *
 *   :is(#root, #overlay-root) *:not([data-pmono]):not([data-pmono] *) {
 *     font-family: var(--paseo-ui-font);
 *   }
 *
 * `:is(#root, …)` contributes an id to the selector, so that rule scores about
 * (1,1,0) against the (0,1,0) of a React Native Web atomic class. It therefore
 * beats every `fontFamily` a plugin sets, which is why embedded faces load and
 * then never appear. `data-pmono` is the host's own opt-out: the attribute and
 * everything beneath it are excluded, so a plugin root carrying it keeps its
 * own typography for the whole subtree.
 *
 * React Native Web maps `dataSet` onto `data-*` attributes. The cast is needed
 * because React Native's `ViewProps` has no `dataSet`, being a web-only
 * affordance — on native the prop is ignored, which is correct, since there is
 * no host stylesheet to escape.
 */
export const hostFontEscape = {
  dataSet: { pmono: true },
} as unknown as ViewProps;
