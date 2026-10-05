import { Platform } from "react-native";
import type { TextStyle, ViewStyle } from "react-native";

/**
 * The host chat scroller sets `user-select: none` on web — a drag over the
 * timeline moves the list instead of painting text — and every surface that
 * shows agent output opts back in. The host's own tool-call detail wrapper does
 * exactly this (`userSelect: "text"` on the wrapper). A plugin renderer that
 * skips the opt-in inherits `none`, so nothing inside it can be highlighted.
 *
 * Web inherits down the tree, so one spread on a callout root covers every
 * descendant. `cursor: auto` restores the I-beam the host's timeline suppresses.
 */
export const selectableSurface = (
  Platform.OS === "web" ? { userSelect: "text", cursor: "auto" } : {}
) as ViewStyle;

/**
 * Native has no inheritance: React Native maps `userSelect` on a Text to the
 * `selectable` prop and ignores it on a View. Text that carries agent or user
 * data therefore also needs `selectable` — see the sibling helper below for the
 * text that must stay out of the clipboard.
 */
export const selectableTextStyle = { userSelect: "text" } as TextStyle;

/**
 * Decorative glyphs are real characters (`✦`, `⛨`, `≡`), and control labels are
 * chrome. Both would land in the clipboard when a selection crosses them, so
 * they stay unselectable even inside a selectable surface.
 */
export const unselectable = (Platform.OS === "web" ? { userSelect: "none" } : {}) as TextStyle;
