import React, { useMemo } from "react";
import { View } from "react-native";
import { useRevealedText } from "@getpaseo/plugin/client/react-native";
import type { PluginTimelineItemProps } from "@getpaseo/plugin/client";
import {
  buildThemeTokens,
  type ExtendedThemeTokens,
  type PluginSurfaceColors,
} from "./components/theme-tokens";
import { ReasoningTrace } from "./components/reasoning-trace";
import { TaskList } from "./components/task-list";
import { TodoSummary } from "./components/todo-summary";
import { useEnhancerPreferences, type EnhancerPreferences } from "./preferences";
import { isCardExpanded } from "./collapse";
import { normalizeTodoTasks, useTodoChanges } from "./todo-history";
import { ActivityCard } from "./components/activity-card";
import type { ActivityPayload } from "./activity-store";
import { AskCard } from "./components/ask-card";
import { formatCardTime } from "./time";
import { hostFontEscape } from "./components/host-font-escape";
import type {
  ReasoningStep,
  ReasoningTraceData,
  TaskItemData,
  TaskListData,
} from "../shared/contracts";

export interface ReasoningPayload {
  text: string;
  phase?: string;
}

export interface TodoPayload {
  items: Array<Record<string, unknown>>;
  phase?: string;
}

export interface AskPayload {
  question: string;
  answer: string;
}

type ReasoningBlock = { kind: "prose"; text: string } | { kind: "code"; code: string; language: string };

const FENCE_OPEN = /^\s*```\s*([\w+#.-]*)\s*$/;
const FENCE_CLOSE = /^\s*```\s*$/;

/**
 * Splits reasoning text into prose paragraphs and fenced code blocks. Blank
 * lines separate paragraphs outside a fence and are kept inside one. A fence
 * still open at the end of the text, as it is mid-stream, takes the rest of the
 * text as its body. A fence without a language tag renders as plain text.
 */
function splitReasoningBlocks(text: string): ReasoningBlock[] {
  const blocks: ReasoningBlock[] = [];
  let prose: string[] = [];
  let fence: { language: string; lines: string[] } | null = null;

  const flushProse = () => {
    const paragraph = prose.join("\n").trim();
    if (paragraph) blocks.push({ kind: "prose", text: paragraph });
    prose = [];
  };

  for (const line of text.split("\n")) {
    if (fence) {
      if (FENCE_CLOSE.test(line)) {
        blocks.push({ kind: "code", code: fence.lines.join("\n"), language: fence.language });
        fence = null;
      } else {
        fence.lines.push(line);
      }
      continue;
    }
    const open = FENCE_OPEN.exec(line);
    if (open) {
      flushProse();
      fence = { language: open[1] || "text", lines: [] };
    } else if (line.trim() === "") {
      flushProse();
    } else {
      prose.push(line);
    }
  }
  flushProse();
  if (fence) blocks.push({ kind: "code", code: fence.lines.join("\n"), language: fence.language });
  return blocks;
}

/**
 * The card tokens at the current Text size, and the item's time unless the
 * setting hides it. Reading the preferences through the hook is what makes a
 * mounted card re-render when a setting changes.
 */
function useCardTokens(
  colors: PluginSurfaceColors,
  timestamp: Date,
): {
  tokens: ExtendedThemeTokens;
  prefs: EnhancerPreferences;
  time: string | undefined;
} {
  const prefs = useEnhancerPreferences();
  const tokens = useMemo(
    () => buildThemeTokens(colors, prefs.fontScale),
    [colors, prefs.fontScale],
  );
  const time = prefs.showTimestamps ? formatCardTime(timestamp) : undefined;
  return { tokens, prefs, time };
}

export function ReasoningRenderer({
  item,
  theme,
  timestamp,
}: PluginTimelineItemProps<ReasoningPayload>) {
  const { tokens, prefs, time } = useCardTokens(theme.colors, timestamp);
  const data = item.data;
  const streaming = data.phase === "streaming";
  // The host owns the reveal cadence, so streamed reasoning animates the same
  // way it does in the native timeline instead of appearing in whole blocks.
  const revealed = useRevealedText(data.text || "", streaming ? "streaming" : "complete");

  const reasoningData: ReasoningTraceData = useMemo(() => {
    const blocks = splitReasoningBlocks(revealed);
    // The final block is the one still being written, so it reads as active
    // while streaming. That advances the rail one tick at a time instead of
    // lighting the whole thing up at once.
    const steps: ReasoningStep[] = blocks.map((block, idx) => ({
      id: `live-step-${idx}`,
      number: idx + 1,
      status: streaming && idx === blocks.length - 1 ? "active" : "completed",
      ...(block.kind === "prose"
        ? { content: block.text }
        : { content: "", codeSnippet: { code: block.code, language: block.language } }),
    }));

    return {
      id: "live-reasoning",
      agentModel: "",
      durationMs: 0,
      totalTokens: Math.round(revealed.length / 4),
      status: streaming ? "thinking" : "completed",
      steps:
        steps.length > 0
          ? steps
          : [
              {
                id: "step-1",
                number: 1,
                title: "Thought Process",
                status: "completed",
                content: revealed,
              },
            ],
    };
  }, [streaming, revealed]);

  return (
    <View {...hostFontEscape}>
      <ReasoningTrace
        data={reasoningData}
        tokens={tokens}
        time={time}
        defaultExpanded={isCardExpanded(
          "reasoning",
          streaming ? "running" : "finished",
          prefs,
        )}
      />
    </View>
  );
}

export function TodoRenderer({
  agentId,
  item,
  theme,
  timestamp,
}: PluginTimelineItemProps<TodoPayload>) {
  const { tokens, time } = useCardTokens(theme.colors, timestamp);
  const data = item.data;

  const todoTasks = useMemo(() => normalizeTodoTasks(data.items || []), [data]);
  const changes = useTodoChanges(agentId, timestamp.getTime(), todoTasks);

  const taskListData: TaskListData = useMemo(() => {
    const tasks: TaskItemData[] = todoTasks.map((task) => ({
      id: task.key,
      title: task.text,
      phase: "Execution",
      status: task.status,
    }));

    return {
      id: "live-todo",
      phaseName: "Checklist Progress",
      tasks,
    };
  }, [todoTasks]);

  return (
    <View {...hostFontEscape}>
      <TaskList
        data={taskListData}
        tokens={tokens}
        time={time}
        summary={<TodoSummary changes={changes} tasks={todoTasks} tokens={tokens} />}
      />
    </View>
  );
}

export function ActivityRenderer({
  item,
  theme,
  timestamp,
}: PluginTimelineItemProps<ActivityPayload>) {
  const { tokens, prefs, time } = useCardTokens(theme.colors, timestamp);
  return (
    <View {...hostFontEscape}>
      <ActivityCard
        {...item.data}
        combine={prefs.combineToolCalls}
        time={time}
        tokens={tokens}
      />
    </View>
  );
}

export function AskRenderer({ item, theme, timestamp }: PluginTimelineItemProps<AskPayload>) {
  const { tokens, time } = useCardTokens(theme.colors, timestamp);
  return (
    <View {...hostFontEscape}>
      <AskCard
        question={item.data.question}
        answer={item.data.answer}
        time={time}
        tokens={tokens}
      />
    </View>
  );
}
