import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Glyph } from "./glyph";
import type { ExtendedThemeTokens } from "./theme-tokens";
import type { TodoChange, TodoChangeType, TodoTask } from "../todo-history";

/** Past this many tasks a change names a count instead of every task. */
const MAX_NAMED_TASKS = 3;

const LABELS: Record<TodoChangeType, string> = {
  completed: "Done",
  started: "Started",
  added: "Added",
};

interface TodoSummaryProps {
  /** What the row changed, or null when there is no earlier list to compare with. */
  changes: TodoChange[] | null;
  tasks: readonly TodoTask[];
  tokens: ExtendedThemeTokens;
}

/**
 * The folded checklist's header: one line per kind of change in the call
 * that filed the row. Without an earlier list it names the running task.
 */
export function TodoSummary({ changes, tasks, tokens }: TodoSummaryProps) {
  const styles = useMemo(
    () =>
      StyleSheet.create({
        lines: { gap: 3, flex: 1 },
        line: { flexDirection: "row", alignItems: "center", gap: 6 },
        label: {
          fontFamily: tokens.fontUi,
          fontSize: 12,
          fontWeight: "600",
          color: tokens.foregroundMuted,
        },
        text: {
          flexShrink: 1,
          fontFamily: tokens.fontUi,
          fontSize: 13,
          color: tokens.foreground,
        },
      }),
    [tokens],
  );

  const glyphs: Record<TodoChangeType, { name: string; color: string }> = {
    completed: { name: "CheckCircle", color: tokens.success },
    started: { name: "CircleDot", color: tokens.accent },
    added: { name: "Plus", color: tokens.foregroundMuted },
  };

  if (changes === null || changes.length === 0) {
    const running = tasks.find((task) => task.status === "in_progress");
    return (
      <View style={styles.lines}>
        <View style={styles.line}>
          <Text selectable style={styles.label}>
            {changes === null ? "Checklist" : "Checklist updated"}
          </Text>
          {running ? (
            <>
              <Glyph name="CircleDot" size={12} color={tokens.accent} />
              <Text selectable numberOfLines={1} style={styles.text}>
                {running.text}
              </Text>
            </>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.lines}>
      {changes.map((change) => (
        <View key={change.type} style={styles.line}>
          <Glyph name={glyphs[change.type].name} size={12} color={glyphs[change.type].color} />
          <Text selectable style={styles.label}>
            {LABELS[change.type]}
          </Text>
          <Text selectable numberOfLines={1} style={styles.text}>
            {change.tasks.length > MAX_NAMED_TASKS
              ? `${change.tasks.length} tasks`
              : change.tasks.join(" · ")}
          </Text>
        </View>
      ))}
    </View>
  );
}
