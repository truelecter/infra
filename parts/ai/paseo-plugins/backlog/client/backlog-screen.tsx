import type { PluginSurfaceProps } from "@getpaseo/plugin/client";
import { useRpc } from "@getpaseo/plugin/client";
import { ScrollView, TextInput, useToast } from "@getpaseo/plugin/client/react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  createItem,
  deleteItem,
  listItems,
  setDescriptionOpen,
  STATUSES,
  updateItem,
  type ItemList,
  type Changes,
  type Status,
} from "../shared/backlog.ts";
import { STATUS_LABEL } from "./format.ts";
import { ItemCard } from "./item-card.tsx";
import { MONOSPACE } from "./markdown-view.tsx";

const FILTERS = {
  active: { label: "Active", statuses: ["open", "waiting"] },
  done: { label: "Done", statuses: ["done"] },
  all: { label: "All", statuses: [...STATUSES] },
} satisfies Record<string, { label: string; statuses: Status[] }>;
type Filter = keyof typeof FILTERS;

const ITEMS_KEY = ["items"];

export function BacklogScreen(props: PluginSurfaceProps) {
  const { theme, layout } = props;
  const toast = useToast();
  const queryClient = useQueryClient();
  const list = useRpc(listItems);
  const create = useRpc(createItem);
  const update = useRpc(updateItem);
  const remove = useRpc(deleteItem);
  const setOpen = useRpc(setDescriptionOpen);
  const [filter, setFilter] = useState<Filter>("active");
  const [draft, setDraft] = useState({ title: "", description: "" });

  // Agents change the backlog through the CLI, which the app is not told about; poll for it.
  const items = useQuery({
    queryKey: ITEMS_KEY,
    queryFn: () => list({}),
    refetchInterval: 5000,
  });

  const onSettled = () => queryClient.invalidateQueries({ queryKey: ITEMS_KEY });
  const onError = (error: unknown) =>
    toast.error(error instanceof Error ? error.message : String(error));
  const changeItem = useMutation({
    mutationFn: (input: { id: number; changes: Changes }) => update(input),
    onSettled,
    onError,
  });
  const deleteMutation = useMutation({ mutationFn: (id: number) => remove({ id }), onSettled, onError });
  // Shown at once, so a tap doesn't wait for the daemon round trip.
  const openMutation = useMutation({
    mutationFn: (input: { id: number; open: boolean }) => setOpen(input),
    onMutate: async ({ id, open }) => {
      await queryClient.cancelQueries({ queryKey: ITEMS_KEY });
      queryClient.setQueryData<ItemList>(ITEMS_KEY, (data) =>
        data && {
          ...data,
          openIds: open ? [...data.openIds, id] : data.openIds.filter((entry) => entry !== id),
        },
      );
    },
    onSettled,
    onError,
  });
  const addItem = useMutation({
    mutationFn: () =>
      create({ title: draft.title, ...(draft.description.trim() ? { description: draft.description } : {}) }),
    onSuccess: () => setDraft({ title: "", description: "" }),
    onSettled,
    onError,
  });

  const styles = useMemo(
    () => ({
      screen: { flex: 1, backgroundColor: theme.colors.surface0 },
      content: {
        padding: layout.compact ? 16 : 24,
        gap: 16,
        maxWidth: 900,
        width: "100%" as const,
        alignSelf: "center" as const,
      },
      row: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 8, alignItems: "center" as const },
      input: {
        flexGrow: 1,
        flexBasis: layout.compact ? ("100%" as const) : 200,
        color: theme.colors.foreground,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
        fontSize: 14,
        backgroundColor: theme.colors.surface1,
      },
      tab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
      section: { color: theme.colors.foregroundMuted, fontSize: 13, fontWeight: "600" as const },
      muted: { color: theme.colors.foregroundMuted, fontSize: 14 },
    }),
    [theme, layout.compact],
  );

  const shown = (items.data?.items ?? []).filter((item) =>
    (FILTERS[filter].statuses as Status[]).includes(item.status),
  );
  const openIds = new Set(items.data?.openIds);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          value={draft.title}
          placeholder="Add an item"
          placeholderTextColor={theme.colors.foregroundMuted}
          onChangeText={(title) => setDraft({ ...draft, title })}
          onSubmitEditing={() => (draft.title.trim() ? addItem.mutate() : undefined)}
          accessibilityLabel="New item title"
        />
        <Pressable
          accessibilityRole="button"
          disabled={!draft.title.trim() || addItem.isPending}
          onPress={() => addItem.mutate()}
          style={[styles.tab, { backgroundColor: theme.colors.accent, opacity: draft.title.trim() ? 1 : 0.5 }]}
        >
          <Text style={{ color: theme.colors.accentForeground }}>Add</Text>
        </Pressable>
        {draft.title.trim() || draft.description ? (
          <TextInput
            style={[
              styles.input,
              { flexBasis: "100%", minHeight: 80, textAlignVertical: "top", fontFamily: MONOSPACE, fontSize: 13 },
            ]}
            multiline
            value={draft.description}
            placeholder="Description (Markdown, optional)"
            placeholderTextColor={theme.colors.foregroundMuted}
            onChangeText={(description) => setDraft({ ...draft, description })}
            accessibilityLabel="New item description"
          />
        ) : null}
      </View>

      <View style={styles.row}>
        {(Object.keys(FILTERS) as Filter[]).map((key) => (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityState={{ selected: key === filter }}
            onPress={() => setFilter(key)}
            style={[styles.tab, key === filter ? { backgroundColor: theme.colors.surface2 } : null]}
          >
            <Text style={{ color: key === filter ? theme.colors.foreground : theme.colors.foregroundMuted }}>
              {FILTERS[key].label}
            </Text>
          </Pressable>
        ))}
      </View>

      {items.isPending ? <Text style={styles.muted}>Loading</Text> : null}
      {items.isError ? (
        <Text style={[styles.muted, { color: theme.colors.statusDanger }]}>
          {items.error instanceof Error ? items.error.message : String(items.error)}
        </Text>
      ) : null}
      {items.isSuccess && shown.length === 0 ? (
        <Text style={styles.muted}>
          Nothing here. Ask an agent to "put this in the backlog", or add an item above.
        </Text>
      ) : null}

      {FILTERS[filter].statuses.map((status) => {
        const group = shown.filter((item) => item.status === status);
        if (!group.length) return null;
        return (
          <View key={status} style={{ gap: 10 }}>
            <Text style={styles.section}>
              {STATUS_LABEL[status]} ({group.length})
            </Text>
            {group.map((item) => (
              <ItemCard
                key={item.id}
                {...props}
                item={item}
                open={openIds.has(item.id)}
                onOpenChange={(open) => openMutation.mutate({ id: item.id, open })}
                onChange={(changes) => changeItem.mutateAsync({ id: item.id, changes })}
                onDelete={() => deleteMutation.mutateAsync(item.id)}
              />
            ))}
          </View>
        );
      })}
    </ScrollView>
  );
}
