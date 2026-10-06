import type { PluginClientContext } from "@getpaseo/plugin/client";
import { z } from "zod";
import { createSiblingFilter } from "./client/todo-history";
import { activityStore } from "./client/activity-store";
import { describeTool } from "./client/tool-kind";
import {
  ActivityRenderer,
  AskRenderer,
  ReasoningRenderer,
  TodoRenderer,
} from "./client/renderers";
import { embedFonts } from "./client/components/embed-fonts";
import { BeautifulChatSettingsPage } from "./client/settings-page";

type JsonValue = boolean | null | number | string | JsonValue[] | { [key: string]: JsonValue };

export default function contribute(client: PluginClientContext) {
  // Inter and Iosevka as `@font-face` data URIs. Web and Electron only: React
  // Native has no `document`, so on the phone these names fall back to the
  // platform faces. Each card root carries `hostFontEscape`, without which
  // Paseo's own `#root` font rule outranks any `fontFamily` a plugin sets.
  const removeFonts = embedFonts();

  // The Text size setting; the id keeps the old settings route working.
  const removeSettings = client.addSettingsScreen({
    id: "chat-presentation",
    title: "Chat presentation",
    icon: "Blocks",
    Component: BeautifulChatSettingsPage,
  });

  // Reasoning, todo, and tool call rows are redrawn; prompts, replies, and
  // everything else stay with Paseo.
  const removeReasoningTransformer = client.addTimelineTransformer({
    id: "omp-enhanced-reasoning",
    query: { itemType: "reasoning" },
    transform({ item, phase }) {
      if (item.type !== "reasoning") return undefined;
      // A turn with reasoning draws its tools as separate rows.
      activityStore.noteThinking();
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
    Component: ReasoningRenderer,
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
              items: item.items as unknown as JsonValue,
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
    Component: TodoRenderer,
  });

  // Prompts and replies stay with Paseo; these only mark where a turn's tool
  // run ends, so the next tool call opens a new one.
  const removeUserBoundary = client.addTimelineTransformer({
    id: "omp-activity-boundary-user",
    query: { itemType: "user_message" },
    transform() {
      activityStore.noteBoundary();
      return undefined;
    },
  });
  const removeAssistantBoundary = client.addTimelineTransformer({
    id: "omp-activity-boundary-assistant",
    query: { itemType: "assistant_message" },
    transform() {
      activityStore.noteBoundary();
      return undefined;
    },
  });

  // Tool calls fold into one activity line per turn, or draw as compact rows
  // when the turn has reasoning. See `client/activity-store.ts` for how the
  // run is worked out from transform order alone.
  const removeToolTransformer = client.addTimelineTransformer({
    id: "omp-activity-tool-call",
    query: { itemType: "tool_call" },
    transform({ item }) {
      if (item.type !== "tool_call") return undefined;
      const name = item.name.toLowerCase();
      if (name === "ask" || name === "ask_user") {
        if (item.detail.type !== "plain_text") return undefined;
        return {
          items: [
            {
              type: "plugin" as const,
              kind: "omp-ask",
              version: 1,
              data: { question: item.detail.label ?? "", answer: item.detail.text ?? "" },
            },
          ],
        };
      }
      const described = describeTool(item);
      const { runId, isAnchor, hasThinking } = activityStore.recordTool({
        callId: item.callId,
        name: item.name,
        status: item.status,
        ...described,
      });
      if (!hasThinking && !isAnchor) return { items: [] };
      const data: JsonValue = hasThinking
        ? { mode: "solo", runId, callId: item.callId }
        : { mode: "group", runId };
      return {
        items: [
          {
            type: "plugin" as const,
            kind: "omp-activity",
            version: 1,
            data,
          },
        ],
      };
    },
  });

  const removeActivityRenderer = client.addTimelineRenderer({
    kind: "omp-activity",
    version: 1,
    schema: z.discriminatedUnion("mode", [
      z.object({ mode: z.literal("group"), runId: z.number() }),
      z.object({ mode: z.literal("solo"), runId: z.number(), callId: z.string() }),
    ]),
    Component: ActivityRenderer,
  });

  const removeAskRenderer = client.addTimelineRenderer({
    kind: "omp-ask",
    version: 1,
    schema: z.object({ question: z.string(), answer: z.string() }),
    Component: AskRenderer,
  });

  return () => {
    removeFonts();
    removeSettings();
    removeReasoningTransformer();
    removeReasoningRenderer();
    removeTodoTransformer();
    removeTodoRenderer();
    removeUserBoundary();
    removeAssistantBoundary();
    removeToolTransformer();
    removeActivityRenderer();
    removeAskRenderer();
  };
}
