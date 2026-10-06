import React, { useMemo, useState, useSyncExternalStore } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Icon as HostIcon } from "@getpaseo/plugin/client/react-native";
import { Glyph } from "./glyph";
import { radius, type ExtendedThemeTokens } from "./theme-tokens";
import { selectableSurface } from "./selection";
import { SyntaxHighlightBlock } from "./syntax-highlight";
import { activityStore, type Run, type ToolEntry } from "../activity-store";
import { summarizeActivity } from "../tool-kind";

type ActivityCardProps =
  | { mode: "group"; runId: number; tokens: ExtendedThemeTokens }
  | { mode: "solo"; runId: number; callId: string; tokens: ExtendedThemeTokens };

/** Re-renders when the run changes; the store mutates runs in place. */
function useRun(runId: number): Run | undefined {
  useSyncExternalStore(
    activityStore.subscribe,
    () => activityStore.getRun(runId)?.version ?? -1,
    () => activityStore.getRun(runId)?.version ?? -1,
  );
  return activityStore.getRun(runId);
}

function statusMark(status: string, tokens: ExtendedThemeTokens): { icon: string; color: string } {
  switch (status) {
    case "completed":
      return { icon: "CircleCheck", color: tokens.success };
    case "failed":
      return { icon: "CircleX", color: tokens.danger };
    case "canceled":
      return { icon: "CircleSlash", color: tokens.foregroundSubtle };
    default:
      return { icon: "Loader", color: tokens.accent };
  }
}

/** The run's overall state: failed wins, then running, then done. */
function runStatus(tools: readonly ToolEntry[]): string {
  if (tools.some((tool) => tool.status === "failed")) return "failed";
  if (tools.some((tool) => tool.status === "running")) return "running";
  return "completed";
}

function ToolRow({ entry, tokens }: { entry: ToolEntry; tokens: ExtendedThemeTokens }) {
  const styles = useMemo(() => buildStyles(tokens), [tokens]);
  const [open, setOpen] = useState(false);
  const mark = statusMark(entry.status, tokens);
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((value) => !value)}
        style={styles.rowHeader}
      >
        <HostIcon name={entry.icon} size={13} color={tokens.foregroundMuted} />
        <Text style={styles.rowLabel} numberOfLines={1}>
          {entry.label}
        </Text>
        <Text style={styles.rowPreview} numberOfLines={1}>
          {entry.preview}
        </Text>
        <HostIcon name={mark.icon} size={13} color={mark.color} />
        <Glyph name={open ? "ChevronDown" : "ChevronRight"} size={12} color={tokens.foregroundSubtle} />
      </Pressable>
      {open ? (
        <View style={styles.rowDetail}>
          {entry.detailText && entry.detailLanguage ? (
            <SyntaxHighlightBlock
              code={entry.detailText}
              language={entry.detailLanguage}
              tokens={tokens}
              compact
            />
          ) : (
            <Text selectable style={entry.detailText ? styles.detailText : styles.detailEmpty}>
              {entry.detailText || "No output"}
            </Text>
          )}
        </View>
      ) : null}
    </View>
  );
}

function buildStyles(tokens: ExtendedThemeTokens) {
  return StyleSheet.create({
    card: {
      // Paseo's wrapper puts SPACING[4] (16px) above and below a plugin row,
      // and a prose row adds its own SPACING[3] (12px) padding, which it only
      // drops next to another assistant block. So the space above a card runs
      // ~28px against the 16px below it. The negative top margin takes that
      // difference back; the host keeps providing the rest of the gap.
      marginTop: -8,
      marginBottom: 0,
      borderRadius: radius.card,
      backgroundColor: tokens.surface0,
      borderWidth: 1,
      borderColor: tokens.borderSubtle,
      overflow: "hidden",
      ...tokens.boxShadow,
      ...selectableSurface,
    },
    summary: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    summaryText: {
      flex: 1,
      fontFamily: tokens.fontUi,
      fontSize: tokens.fs(12.5),
      fontWeight: "600",
      color: tokens.foregroundMuted,
    },
    list: {
      gap: 3,
      paddingHorizontal: 6,
      paddingBottom: 6,
      borderTopWidth: 1,
      borderTopColor: tokens.borderSubtle,
      paddingTop: 6,
    },
    soloWrap: {
      marginVertical: 1.5,
    },
    row: {
      borderRadius: radius.block,
      backgroundColor: tokens.surface1,
      borderWidth: 1,
      borderColor: tokens.borderSubtle,
      overflow: "hidden",
    },
    rowHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    rowLabel: {
      fontFamily: tokens.fontUi,
      fontSize: tokens.fs(12.5),
      fontWeight: "600",
      color: tokens.foreground,
      flexShrink: 0,
      maxWidth: "40%",
    },
    rowPreview: {
      flex: 1,
      fontFamily: tokens.fontMono,
      fontSize: tokens.fs(12),
      color: tokens.foregroundMuted,
    },
    rowDetail: {
      paddingHorizontal: 10,
      paddingBottom: 8,
    },
    detailText: {
      fontFamily: tokens.fontMono,
      fontSize: tokens.fs(12),
      lineHeight: tokens.fs(17),
      color: tokens.foregroundMuted,
      backgroundColor: tokens.surfaceCode,
      borderRadius: radius.block,
      padding: 8,
    },
    detailEmpty: {
      fontFamily: tokens.fontUi,
      fontSize: tokens.fs(12),
      fontStyle: "italic",
      color: tokens.foregroundSubtle,
    },
  });
}

/**
 * A turn's tool calls. `group` draws the folded summary line for the whole
 * run and lists the calls when opened; `solo` draws one call as a compact row,
 * which is what a turn with reasoning gets.
 */
export function ActivityCard(props: ActivityCardProps) {
  const { tokens } = props;
  const styles = useMemo(() => buildStyles(tokens), [tokens]);
  const run = useRun(props.runId);
  const [open, setOpen] = useState(false);

  if (props.mode === "solo") {
    const entry = run?.tools.find((tool) => tool.callId === props.callId);
    if (!entry) return null;
    return (
      <View style={styles.soloWrap}>
        <ToolRow entry={entry} tokens={tokens} />
      </View>
    );
  }

  const tools = run?.tools ?? [];
  if (tools.length === 0) return null;
  // One call needs no summary: the row says everything the line would.
  if (tools.length === 1) {
    return (
      <View style={styles.soloWrap}>
        <ToolRow entry={tools[0]!} tokens={tokens} />
      </View>
    );
  }

  const mark = statusMark(runStatus(tools), tokens);
  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((value) => !value)}
        style={styles.summary}
      >
        <HostIcon name="Wrench" size={13} color={tokens.foregroundMuted} />
        <Text style={styles.summaryText} numberOfLines={1}>
          {summarizeActivity(tools.map((tool) => tool.countBucket))}
        </Text>
        <HostIcon name={mark.icon} size={13} color={mark.color} />
        <Glyph name={open ? "ChevronDown" : "ChevronRight"} size={12} color={tokens.foregroundSubtle} />
      </Pressable>
      {open ? (
        <View style={styles.list}>
          {tools.map((tool) => (
            <ToolRow key={tool.callId} entry={tool} tokens={tokens} />
          ))}
        </View>
      ) : null}
    </View>
  );
}
