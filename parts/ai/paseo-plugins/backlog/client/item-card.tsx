import type { PluginSurfaceProps } from "@getpaseo/plugin/client";
import { usePaseo } from "@getpaseo/plugin/client";
import { Icon, TextInput } from "@getpaseo/plugin/client/react-native";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { STATUSES, type Changes, type Item } from "../shared/backlog.ts";
import { formatWhen, STATUS_LABEL, statusColor } from "./format.ts";
import { Markdown, MONOSPACE } from "./markdown-view.tsx";

type HostProps = Pick<PluginSurfaceProps, "theme" | "layout" | "navigation">;

function useStyles({ theme, layout }: HostProps) {
  return useMemo(
    () => ({
      card: {
        padding: layout.compact ? 12 : 16,
        gap: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface1,
      },
      header: { flexDirection: "row" as const, alignItems: "flex-start" as const, gap: 8 },
      title: { flex: 1, color: theme.colors.foreground, fontSize: 15, fontWeight: "600" as const },
      id: { color: theme.colors.foregroundMuted, fontSize: 15 },
      text: { color: theme.colors.foreground, fontSize: 14 },
      muted: { color: theme.colors.foregroundMuted, fontSize: 13 },
      row: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 8 },
      chip: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface2,
      },
      button: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
        backgroundColor: theme.colors.surface2,
      },
      input: {
        color: theme.colors.foreground,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 6,
        fontSize: 14,
      },
    }),
    [theme, layout.compact],
  );
}

/** The chat an item came from, by its current title, opening that agent on press. */
function AgentLink(props: HostProps & { agentId: string; prefix: string }) {
  const { agentId, prefix, navigation } = props;
  const styles = useStyles(props);
  const paseo = usePaseo();
  // useAgent only works inside workspace panels, so ask the daemon; this also covers archived agents.
  const title = useQuery({
    queryKey: ["agent-title", agentId],
    queryFn: async () => (await paseo.agents.ref(agentId).refresh())?.agent.title ?? null,
    staleTime: 60_000,
    retry: false,
  });
  const label = title.data ?? `agent ${agentId.slice(0, 8)}`;
  const text = (
    <Text style={styles.muted}>
      {prefix} <Text style={{ textDecorationLine: navigation ? "underline" : "none" }}>{label}</Text>
    </Text>
  );
  if (!navigation) return text;
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`Open chat ${label}`}
      onPress={() => navigation.openAgent({ agentId })}
    >
      {text}
    </Pressable>
  );
}

export function ItemCard(
  props: HostProps & {
    item: Item;
    /** Description unfolded; descriptions start folded. */
    open: boolean;
    onOpenChange(open: boolean): void;
    onChange(changes: Changes): Promise<unknown>;
    onDelete(): Promise<unknown>;
  },
) {
  const { item, open, theme, onOpenChange, onChange, onDelete } = props;
  const styles = useStyles(props);
  const [editing, setEditing] = useState<{ title: string; description: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const history = showHistory ? [...item.log].reverse() : item.log.slice(-1);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.id}>#{item.id}</Text>
        {editing ? (
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={editing.title}
            onChangeText={(title) => setEditing({ ...editing, title })}
            accessibilityLabel="Title"
          />
        ) : (
          <Text style={styles.title}>{item.title}</Text>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={editing ? "Cancel editing" : "Edit item"}
          onPress={() =>
            setEditing(editing ? null : { title: item.title, description: item.description })
          }
          hitSlop={8}
        >
          <Icon name={editing ? "X" : "Pencil"} size={16} color={theme.colors.foregroundMuted} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Delete item"
          onPress={() => setConfirmDelete(!confirmDelete)}
          hitSlop={8}
        >
          <Icon name="Trash2" size={16} color={theme.colors.foregroundMuted} />
        </Pressable>
      </View>

      {confirmDelete ? (
        <View style={[styles.row, { alignItems: "center" }]}>
          <Text style={styles.text}>Delete #{item.id}?</Text>
          <Pressable
            accessibilityRole="button"
            style={[styles.button, { backgroundColor: theme.colors.statusDanger }]}
            onPress={() => void onDelete()}
          >
            <Text style={{ color: theme.colors.accentForeground }}>Delete</Text>
          </Pressable>
          <Pressable accessibilityRole="button" style={styles.button} onPress={() => setConfirmDelete(false)}>
            <Text style={styles.text}>Keep</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.row}>
        {STATUSES.map((status) => {
          const active = status === item.status;
          const color = statusColor(theme, status);
          return (
            <Pressable
              key={status}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Mark ${STATUS_LABEL[status]}`}
              style={[styles.chip, active ? { backgroundColor: color, borderColor: color } : null]}
              onPress={() => (active ? undefined : void onChange({ status }))}
            >
              <Text style={{ color: active ? theme.colors.accentForeground : theme.colors.foreground, fontSize: 13 }}>
                {STATUS_LABEL[status]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {editing ? (
        <View style={{ gap: 8 }}>
          <TextInput
            style={[styles.input, { minHeight: 140, textAlignVertical: "top", fontFamily: MONOSPACE, fontSize: 13 }]}
            multiline
            value={editing.description}
            placeholder="Description (Markdown)"
            placeholderTextColor={theme.colors.foregroundMuted}
            onChangeText={(description) => setEditing({ ...editing, description })}
            accessibilityLabel="Description"
          />
          <Pressable
            accessibilityRole="button"
            style={[styles.button, { alignSelf: "flex-start", backgroundColor: theme.colors.accent }]}
            disabled={!editing.title.trim()}
            onPress={() =>
              void onChange({ title: editing.title, description: editing.description }).then(() =>
                setEditing(null),
              )
            }
          >
            <Text style={{ color: theme.colors.accentForeground }}>Save</Text>
          </Pressable>
        </View>
      ) : item.description ? (
        <View style={{ gap: 8 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            onPress={() => onOpenChange(!open)}
            hitSlop={8}
            style={{ flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start" }}
          >
            <Icon name={open ? "ChevronDown" : "ChevronRight"} size={14} color={theme.colors.foregroundMuted} />
            <Text style={[styles.muted, { textDecorationLine: "underline" }]}>
              {open ? "Hide description" : "Show description"}
            </Text>
          </Pressable>
          {open ? <Markdown source={item.description} theme={theme} /> : null}
        </View>
      ) : null}

      {item.agentId ? <AgentLink {...props} agentId={item.agentId} prefix="From" /> : null}

      <View style={{ gap: 4 }}>
        {history.map((entry, index) => (
          <View key={`${entry.at}-${index}`} style={[styles.row, { gap: 6 }]}>
            <Text style={styles.muted}>{formatWhen(entry.at)}</Text>
            {entry.status ? (
              <Text style={[styles.muted, { color: statusColor(theme, entry.status) }]}>
                {STATUS_LABEL[entry.status]}
              </Text>
            ) : null}
            {entry.text ? <Text style={[styles.muted, { color: theme.colors.foreground }]}>{entry.text}</Text> : null}
            {entry.agentId && entry.agentId !== item.agentId ? (
              <AgentLink {...props} agentId={entry.agentId} prefix="by" />
            ) : null}
          </View>
        ))}
        {item.log.length > 1 ? (
          <Pressable accessibilityRole="button" onPress={() => setShowHistory(!showHistory)}>
            <Text style={[styles.muted, { textDecorationLine: "underline" }]}>
              {showHistory ? "Show latest only" : `Show history (${item.log.length})`}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
