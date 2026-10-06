import type { PluginClientContext } from "@getpaseo/plugin/client";
import { z } from "zod";
import { BeautifulChatSettingsPage } from "./client/settings-page";
import { embedFonts } from "./client/components/embed-fonts";
import { installFrostedGlass } from "./client/components/frosted";
import { installShimmer } from "./client/components/shimmer";
import { installPointerGlow } from "./client/components/glow";
import { installHostNoticeStyle } from "./client/components/host-notice";
import { installChatFind } from "./client/components/chat-find";
import { extractPromptImages } from "./client/prompt-images";
import { getEnhancerPreferences } from "./client/preferences";
import { createSiblingFilter } from "./client/todo-history";
import {
  LiveToolCallRenderer,
  LiveReasoningRenderer,
  LiveTodoRenderer,
  LiveUserMessageRenderer,
  LiveNoticeRenderer,
  LiveAssistantRenderer,
} from "./client/live-renderers";
import { ForkScreen } from "./client/components/fork-screen";
import { setForkScreenOpener } from "./client/agent-actions";

type JsonValue = boolean | null | number | string | JsonValue[] | { [key: string]: JsonValue };

function toJsonValue(value: unknown): JsonValue {
  return value as JsonValue;
}

export default function contribute(client: PluginClientContext) {
  // Install the bundled faces before any surface paints.
  const removeFonts = embedFonts();
  const removeFrost = installFrostedGlass();
  const removeShimmer = installShimmer();
  const removeGlow = installPointerGlow();
  // The host draws  rows itself; this only re-chromes them.
  const removeNoticeStyle = installHostNoticeStyle();
  // Paseo's Ctrl+F cannot reveal rows this plugin draws; this bar can.
  const removeChatFind = installChatFind();

  // Configuration lives in the host Settings area. The plugin has no showcase
  // surface, panels, or Command Center item.
  client.addSettingsScreen({
    id: "chat-presentation",
    title: "Chat presentation",
    icon: "Blocks",
    Component: BeautifulChatSettingsPage,
  });

  // The reply footer's Fork opens this screen; it has no sidebar item.
  const removeForkScreen = client.addSurface("fork", ForkScreen);
  setForkScreenOpener(() => client.openSurface("fork"));

  // Live chat timeline interception: render real tool calls, reasoning, and todos with enhanced UI.
  const removeToolTransformer = client.addTimelineTransformer({
    id: "omp-enhanced-tool-call",
    query: { itemType: "tool_call" },
    transform({ item, phase }) {
      if (item.type !== "tool_call") return undefined;
      return {
        items: [
          {
            type: "plugin" as const,
            kind: "omp-tool-call",
            version: 1,
            data: {
              name: item.name,
              status: item.status,
              detail: toJsonValue(item.detail),
              ...(item.callId ? { callId: item.callId } : {}),
              error: item.error ? String(item.error) : null,
              phase,
            },
          },
        ],
      };
    },
  });

  const removeToolRenderer = client.addTimelineRenderer({
    kind: "omp-tool-call",
    version: 1,
    schema: z.object({
      name: z.string(),
      status: z.string(),
      detail: z.record(z.string(), z.unknown()).optional(),
      callId: z.string().optional(),
      error: z.string().nullable().optional(),
      phase: z.string().optional(),
    }),
    Component: LiveToolCallRenderer,
  });

  const removeReasoningTransformer = client.addTimelineTransformer({
    id: "omp-enhanced-reasoning",
    query: { itemType: "reasoning" },
    transform({ item, phase }) {
      if (item.type !== "reasoning") return undefined;
      return {
        items: [
          {
            type: "plugin" as const,
            kind: "omp-reasoning",
            version: 1,
            data: {
              text: item.text,
              phase,
            },
          },
        ],
      };
    },
  });

  const removeReasoningRenderer = client.addTimelineRenderer({
    kind: "omp-reasoning",
    version: 1,
    schema: z.object({
      text: z.string(),
      phase: z.string().optional(),
    }),
    Component: LiveReasoningRenderer,
  });

  // One todo call can make the host file several rows with the same list; the
  // card shows every change of the call, so only the first of them is drawn.
  const isSiblingTodo = createSiblingFilter();
  const removeTodoTransformer = client.addTimelineTransformer({
    id: "omp-enhanced-todo",
    query: { itemType: "todo" },
    transform({ item, phase }) {
      if (item.type !== "todo") return undefined;
      if (isSiblingTodo(JSON.stringify(item.items))) return { items: [] };
      return {
        items: [
          {
            type: "plugin" as const,
            kind: "omp-todo",
            version: 1,
            data: {
              items: toJsonValue(item.items),
              phase,
            },
          },
        ],
      };
    },
  });

  const removeTodoRenderer = client.addTimelineRenderer({
    kind: "omp-todo",
    version: 1,
    schema: z.object({
      items: z.array(z.record(z.string(), z.unknown())),
      phase: z.string().optional(),
    }),
    Component: LiveTodoRenderer,
  });

  const removeUserTransformer = client.addTimelineTransformer({
    id: "omp-enhanced-user-message",
    query: { itemType: "user_message" },
    transform({ item }) {
      if (item.type !== "user_message") return undefined;
      // The host strips images while mapping the stream item, so an enhanced
      // bubble would silently swallow a pasted screenshot. The preference lets
      // the reader trade the bubble for the host's image previews.
      if (!getEnhancerPreferences().enhancedUserBubble) return undefined;
      const images = extractPromptImages(item);
      // Replacing the item drops whatever this renderer does not carry, so a
      // message with an attachment it cannot show is left to the host.
      if (images.hasUnrenderable) return undefined;
      // `messageId` rides along so the renderer can carry the host's own
      // `data-history-row-id`, which is the id the chat outline scrolls to.
      // Replacing the item leaves the outline nothing to find otherwise.
      return {
        items: [
          {
            type: "plugin" as const,
            kind: "omp-user-message",
            version: 1,
            data: toJsonValue({
              text: item.text,
              ...(images.uris.length > 0 ? { images: images.uris } : {}),
              ...(item.messageId ? { messageId: item.messageId } : {}),
            }),
          },
        ],
      };
    },
  });

  const removeUserRenderer = client.addTimelineRenderer({
    kind: "omp-user-message",
    version: 1,
    schema: z.object({
      text: z.string(),
      images: z.array(z.string()).optional(),
      messageId: z.string().optional(),
    }),
    Component: LiveUserMessageRenderer,
  });

  // The assistant's reply. The preference is read inside `transform` so a
  // change takes effect on the next message without a plugin reload, and a
  // reply the plugin should not own is left to the host.
  const removeAssistantTransformer = client.addTimelineTransformer({
    id: "omp-enhanced-assistant",
    query: { itemType: "assistant_message" },
    transform({ item }) {
      if (item.type !== "assistant_message") return undefined;
      if (!getEnhancerPreferences().assistantMarkdown) return undefined;
      if (!item.text.trim()) return undefined;
      return {
        items: [
          {
            type: "plugin" as const,
            kind: "omp-assistant",
            version: 1,
            data: { text: item.text, ...(item.messageId ? { messageId: item.messageId } : {}) },
          },
        ],
      };
    },
  });

  const removeAssistantRenderer = client.addTimelineRenderer({
    kind: "omp-assistant",
    version: 1,
    schema: z.object({ text: z.string(), messageId: z.string().optional() }),
    Component: LiveAssistantRenderer,
  });

  // Only `error` is intercepted here. Paseo 0.8 accepts transformers for
  // user_message, assistant_message, reasoning, tool_call, todo, error, and
  // compaction; `notification` — the ⓘ row a finished background job produces —
  // is not on that list, and registering it throws. Every contribution in this
  // function shares one call frame, so that throw drops every renderer the
  // plugin installs and the whole chat falls back to native styling. Add the
  // notification transformer the day the host accepts the type, not before.

  const removeErrorTransformer = client.addTimelineTransformer({
    id: "omp-enhanced-error",
    query: { itemType: "error" },
    transform({ item }) {
      if (item.type !== "error") return undefined;
      return {
        items: [
          {
            type: "plugin" as const,
            kind: "omp-notice",
            version: 1,
            data: { level: "error", message: item.message, fatal: true },
          },
        ],
      };
    },
  });

  const removeNoticeRenderer = client.addTimelineRenderer({
    kind: "omp-notice",
    version: 1,
    schema: z.object({
      level: z.string(),
      message: z.string(),
      fatal: z.boolean().optional(),
    }),
    Component: LiveNoticeRenderer,
  });

  return () => {
    removeFonts();
    removeFrost();
    removeShimmer();
    removeGlow();
    removeNoticeStyle();
    removeChatFind();
    removeToolTransformer();
    removeToolRenderer();
    removeReasoningTransformer();
    removeReasoningRenderer();
    removeTodoTransformer();
    removeTodoRenderer();
    removeUserTransformer();
    removeUserRenderer();
    removeAssistantTransformer();
    removeAssistantRenderer();
    removeErrorTransformer();
    removeNoticeRenderer();
    removeForkScreen();
    setForkScreenOpener(null);
  };
}
