import type { PluginButtonContentProps, PluginTimelineItemProps } from "@getpaseo/plugin/client";
import { Icon } from "@getpaseo/plugin/client/react-native";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { z } from "zod";
import { useAgentTodos } from "./store.ts";
import { todoProgress, type Todo, type TodoStatus, type todoListSchema } from "./todos.ts";

type Theme = PluginButtonContentProps["theme"];

const STATUS_ICON: Record<TodoStatus, string> = {
  pending: "Circle",
  in_progress: "CircleDot",
  completed: "CircleCheck",
  cancelled: "CircleSlash",
};

function useStyles(theme: Theme) {
  return useMemo(
    () => ({
      list: { gap: 6 },
      row: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8 },
      text: { flexShrink: 1, color: theme.colors.foregroundMuted },
      active: { flexShrink: 1, color: theme.colors.foreground },
      done: {
        flexShrink: 1,
        color: theme.colors.foregroundMuted,
        textDecorationLine: "line-through" as const,
      },
      header: { flexDirection: "row" as const, alignItems: "center" as const, gap: 8 },
      title: { color: theme.colors.foreground, fontWeight: "600" as const },
      progress: { color: theme.colors.foregroundMuted },
      current: { flexShrink: 1, color: theme.colors.foregroundMuted },
      card: { gap: 8, paddingVertical: 4 },
    }),
    [theme],
  );
}

// Long text would otherwise squeeze the icon in a row.
function FixedIcon({ name, size, color }: { name: string; size: number; color: string }) {
  return (
    <View style={{ width: size, height: size, flexShrink: 0 }}>
      <Icon name={name} size={size} color={color} />
    </View>
  );
}

function TaskRows({ todos, theme }: { todos: readonly Todo[]; theme: Theme }) {
  const styles = useStyles(theme);
  return (
    <View style={styles.list}>
      {todos.map((todo, index) => {
        const isActive = todo.status === "in_progress";
        const isDone = todo.status === "completed" || todo.status === "cancelled";
        let textStyle = styles.text;
        if (isActive) textStyle = styles.active;
        if (isDone) textStyle = styles.done;
        return (
          <View key={`${index}:${todo.content}`} style={styles.row} accessibilityLabel={todo.content}>
            <FixedIcon
              name={STATUS_ICON[todo.status]}
              size={16}
              color={isActive ? theme.colors.accent : theme.colors.foregroundMuted}
            />
            <Text style={textStyle}>{todo.content}</Text>
          </View>
        );
      })}
    </View>
  );
}

export function TasksPopover(props: PluginButtonContentProps) {
  const agentId = props.context === "agent" ? props.agentId : "";
  const todos = useAgentTodos(agentId);
  return <TaskRows todos={todos} theme={props.theme} />;
}

export function TaskListItem({
  item,
  theme,
}: PluginTimelineItemProps<z.output<typeof todoListSchema>>) {
  const [expanded, setExpanded] = useState(false);
  const styles = useStyles(theme);
  const { todos } = item.data;
  const { completed, total } = todoProgress(todos);
  const current = todos.find((todo) => todo.status === "in_progress");
  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Tasks, ${completed} of ${total} done`}
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((value) => !value)}
        style={styles.header}
      >
        <FixedIcon
          name={expanded ? "ChevronDown" : "ChevronRight"}
          size={14}
          color={theme.colors.foregroundMuted}
        />
        <FixedIcon name="ListChecks" size={16} color={theme.colors.foregroundMuted} />
        <Text style={styles.title}>Tasks</Text>
        <Text style={styles.progress}>
          {completed}/{total}
        </Text>
        {current ? (
          <Text numberOfLines={1} style={styles.current}>
            {current.content}
          </Text>
        ) : null}
      </Pressable>
      {expanded ? <TaskRows todos={todos} theme={theme} /> : null}
    </View>
  );
}
