import type { ViewProps } from "react-native";

/**
 * Makes a plugin-rendered prompt findable by the host's chat outline.
 *
 * Clicking a tick in the outline calls `scrollToMessage(id)`, which looks the
 * row up in the DOM by `data-history-row-id`
 * (`agent-stream/use-scroll-to-message.web.ts:98`). The id it passes comes from
 * the *unprojected* stream items the outline is handed
 * (`agent-stream/view.tsx:632`), while the rendered row carries the projected
 * plugin id `<pluginId>/<itemId>` (`plugins/timeline/projection.ts:98`). The
 * two never match once this plugin renders the prompt, so the jump silently
 * does nothing.
 *
 * A user message's stream id is its `messageId` when the provider supplied one
 * (`types/stream.ts:901`), and that id survives into the item a plugin
 * receives. Carrying it on this subtree gives the lookup something to find:
 * the attribute is the host's own convention, and the value is the id the host
 * is already searching for — not a guess.
 *
 * Without a `messageId` — an optimistic echo before the provider answers — the
 * native id is a generated string this side cannot know, so nothing is stamped
 * and the outline behaves as it does today.
 */
export function promptRowAnchor(messageId: string | undefined): ViewProps {
  if (!messageId) return {} as ViewProps;
  return { dataSet: { historyRowId: messageId } } as unknown as ViewProps;
}
