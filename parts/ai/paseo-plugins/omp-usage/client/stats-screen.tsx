import type { PluginScreenProps } from "@getpaseo/plugin/client";
import { useRpc } from "@getpaseo/plugin/client";
import { ScrollView } from "@getpaseo/plugin/client/react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { compactNumber, dayLabel, dollars } from "../shared/format.ts";
import { getStats, RANGE_LABELS, RANGES, type Range, type StatsView } from "../shared/stats.ts";

interface Column<Row> {
  label: string;
  value: (row: Row) => string;
  /** Share of the row width; the first column usually takes the most. */
  flex: number;
  /** Hidden on compact layouts. */
  wide?: boolean;
}

export function StatsScreen({ theme, layout }: PluginScreenProps) {
  const [range, setRange] = useState<Range>("week");
  const [refreshing, setRefreshing] = useState(false);
  const readStats = useRpc(getStats);
  const queryClient = useQueryClient();
  const queryKey = ["omp-usage-stats", range];
  const stats = useQuery({
    queryKey,
    queryFn: () => readStats({ range }),
    // Cost Explorer answers in 10-20 s on a cold cache; ask again until it has.
    refetchInterval: (query) => (query.state.data?.aws.status === "loading" ? 5_000 : false),
    refetchOnWindowFocus: false,
  });

  const refresh = async () => {
    setRefreshing(true);
    try {
      queryClient.setQueryData(queryKey, await readStats({ range, refresh: true }));
    } finally {
      setRefreshing(false);
    }
  };

  const c = theme.colors;
  const styles = useMemo(
    () => ({
      screen: { flex: 1, backgroundColor: c.surface0 },
      content: {
        padding: layout.compact ? 12 : 24,
        gap: 16,
        maxWidth: 1040,
        width: "100%" as const,
        alignSelf: "center" as const,
      },
      card: {
        gap: 10,
        padding: 14,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: c.border,
        backgroundColor: c.surface1,
      },
      wrap: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 8, alignItems: "center" as const },
      title: { color: c.foreground, fontSize: 16, fontWeight: "600" as const },
      text: { color: c.foreground, fontSize: 14 },
      muted: { color: c.foregroundMuted, fontSize: 13 },
      big: { color: c.foreground, fontSize: layout.compact ? 24 : 30, fontWeight: "600" as const, fontVariant: ["tabular-nums" as const] },
      cell: { color: c.foreground, fontSize: 13, fontVariant: ["tabular-nums" as const] },
      head: { color: c.foregroundMuted, fontSize: 12 },
      tableRow: { flexDirection: "row" as const, gap: 8, paddingVertical: 4, alignItems: "center" as const },
      chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
      tile: { minWidth: layout.compact ? 140 : 150, flexGrow: 1, flexBasis: 0, gap: 2, padding: 10, borderRadius: 8, backgroundColor: c.surface2 },
      track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: c.surface2, overflow: "hidden" as const },
    }),
    [c, layout.compact],
  );

  const card = (title: string, children: ReactNode, note?: string) => (
    <View style={styles.card}>
      <View style={styles.wrap}>
        <Text style={styles.title}>{title}</Text>
        {note ? <Text style={styles.muted}>{note}</Text> : null}
      </View>
      {children}
    </View>
  );

  const table = <Row,>(columns: Column<Row>[], rows: Row[], key: (row: Row) => string) => {
    const shown = columns.filter((column) => !(layout.compact && column.wide));
    return (
      <View>
        <View style={styles.tableRow}>
          {shown.map((column, index) => (
            <Text key={column.label} style={[styles.head, { flex: column.flex, textAlign: index === 0 ? "left" : "right" }]}>
              {column.label}
            </Text>
          ))}
        </View>
        {rows.map((row) => (
          <View key={key(row)} style={[styles.tableRow, { borderTopWidth: 1, borderTopColor: c.border }]}>
            {shown.map((column, index) => (
              <Text
                key={column.label}
                numberOfLines={1}
                style={[styles.cell, { flex: column.flex, textAlign: index === 0 ? "left" : "right" }]}
              >
                {column.value(row)}
              </Text>
            ))}
          </View>
        ))}
      </View>
    );
  };

  const data = stats.data;

  const body = (view: StatsView) => {
    const { totals, aws } = view;
    const priced = view.ompCost !== null;
    // Bars follow OMP at account prices when Cost Explorer answered, else the API-equivalent estimate.
    const barCosts = view.days.map((day) => day.ompCost ?? day.cost);
    const maxDay = Math.max(...barCosts, 0.000001);
    const money = (value: number | null) => (value === null ? "-" : dollars(value));
    const tiles: [string, string][] = [
      ["Requests", totals.requests.toLocaleString("en-US")],
      ["Failed", totals.failed.toLocaleString("en-US")],
      ["Output tokens", compactNumber(totals.outputTokens)],
      ["Cache read", compactNumber(totals.cacheReadTokens)],
      ["Cache write", compactNumber(totals.cacheWriteTokens)],
      ["Uncached input", compactNumber(totals.inputTokens)],
      ["Avg first token", totals.avgTtftMs === null ? "-" : `${(totals.avgTtftMs / 1000).toFixed(1)} s`],
      ["Avg tokens/s", totals.avgTokensPerSecond === null ? "-" : totals.avgTokensPerSecond.toFixed(1)],
    ];
    const figures: { label: string; value: string; note: string; warn?: boolean }[] = [
      {
        label: "OMP at account prices",
        value: view.ompCost !== null ? dollars(view.ompCost) : aws.status === "loading" ? "..." : "-",
        note:
          aws.status === "ok"
            ? `OMP's tokens at the average price this account paid per model and token kind (Cost Explorer${aws.ratesFrom ? ` since ${dayLabel(aws.ratesFrom)}` : ""})${view.unpricedModels.length ? `; no account price for ${view.unpricedModels.join(", ")}, API-equivalent used` : ""}`
            : aws.status === "loading"
              ? "Asking Cost Explorer..."
              : `Cost Explorer unavailable: ${aws.reason}`,
        warn: aws.status === "unavailable",
      },
      {
        label: "All Bedrock in the account",
        value: aws.status === "ok" ? dollars(aws.accountTotal) : "-",
        note:
          aws.status === "ok"
            ? `Every service in the account of ${aws.profile}${aws.through ? `, data through ${dayLabel(aws.through)}` : ""}`
            : "Needs Cost Explorer",
      },
      {
        label: "API-equivalent",
        value: dollars(totals.cost),
        note: "OMP's estimate at public per-token prices",
      },
    ];
    return (
      <>
        {card(
          "Cost",
          <View testID="omp-usage-cost" style={[styles.wrap, { gap: 24, alignItems: "flex-start" }]}>
            {figures.map((figure) => (
              <View key={figure.label} style={{ gap: 2, flexGrow: 1, flexBasis: 220 }}>
                <Text style={styles.muted}>{figure.label}</Text>
                <Text style={styles.big}>{figure.value}</Text>
                <Text style={[styles.muted, figure.warn ? { color: c.statusWarning } : null]}>{figure.note}</Text>
              </View>
            ))}
          </View>,
        )}
        {card(
          "Tokens",
          <View style={styles.wrap}>
            {tiles.map(([label, value]) => (
              <View key={label} style={styles.tile}>
                <Text style={styles.muted}>{label}</Text>
                <Text style={[styles.text, { fontSize: 18, fontVariant: ["tabular-nums"] }]}>{value}</Text>
              </View>
            ))}
          </View>,
        )}
        {card(
          "By day",
          <View>
            {view.days.map((day, index) => (
              <View key={day.date} style={styles.tableRow}>
                <Text style={[styles.cell, { width: 56 }]}>{dayLabel(day.date)}</Text>
                <View style={styles.track}>
                  <View style={{ width: `${(barCosts[index]! / maxDay) * 100}%`, height: 8, backgroundColor: c.accent }} />
                </View>
                <Text style={[styles.cell, { width: 76, textAlign: "right" }]}>{money(day.ompCost)}</Text>
                {layout.compact ? null : (
                  <Text style={[styles.cell, { width: 76, textAlign: "right", color: c.foregroundMuted }]}>
                    {money(day.accountCost)}
                  </Text>
                )}
                <Text style={[styles.cell, { width: 84, textAlign: "right", color: c.foregroundMuted }]}>
                  {dollars(day.cost)}
                </Text>
                {layout.compact ? null : (
                  <Text style={[styles.cell, { width: 64, textAlign: "right", color: c.foregroundMuted }]}>
                    {compactNumber(day.requests)} req
                  </Text>
                )}
              </View>
            ))}
          </View>,
          priced
            ? layout.compact
              ? "OMP at account prices, API-equivalent"
              : "OMP at account prices, all Bedrock in the account, API-equivalent, requests"
            : "API-equivalent (Cost Explorer unavailable)",
        )}
        {card(
          "Models",
          table(
            [
              { label: "Model", value: (row) => row.model + (row.priced ? "" : " *"), flex: 3 },
              { label: "Requests", value: (row) => compactNumber(row.requests), flex: 1.1, wide: true },
              { label: "Output", value: (row) => compactNumber(row.outputTokens), flex: 1.1, wide: true },
              { label: "Cache read", value: (row) => compactNumber(row.cacheReadTokens), flex: 1.1, wide: true },
              { label: "OMP", value: (row) => money(row.ompCost), flex: 1.3 },
              { label: "Account", value: (row) => money(row.accountCost), flex: 1.3, wide: true },
              { label: "API-eq", value: (row) => dollars(row.cost), flex: 1.3 },
            ],
            view.models,
            (row) => row.model,
          ),
          priced
            ? "OMP: at account prices · Account: all Bedrock in the account · * no account price, API-equivalent used"
            : undefined,
        )}
        {card(
          "Folders",
          table(
            [
              { label: "Folder", value: (row) => row.folder, flex: 4 },
              { label: "Sessions", value: (row) => String(row.sessions), flex: 1, wide: true },
              { label: "Requests", value: (row) => compactNumber(row.requests), flex: 1, wide: true },
              { label: "OMP", value: (row) => money(row.ompCost), flex: 1.3 },
              { label: "API-eq", value: (row) => dollars(row.cost), flex: 1.3 },
            ],
            view.folders,
            (row) => row.folder,
          ),
        )}
        <View style={[styles.wrap, { gap: 16, alignItems: "stretch" }]}>
          <View style={{ flexGrow: 1, flexBasis: 280 }}>
            {card(
              "Main agents and subagents",
              table(
                [
                  { label: "Kind", value: (row) => row.agentType, flex: 2 },
                  { label: "Requests", value: (row) => compactNumber(row.requests), flex: 1 },
                  { label: "OMP", value: (row) => money(row.ompCost), flex: 1.3 },
                  { label: "API-eq", value: (row) => dollars(row.cost), flex: 1.3 },
                ],
                view.agentTypes,
                (row) => row.agentType,
              ),
            )}
          </View>
          <View style={{ flexGrow: 1, flexBasis: 280 }}>
            {card(
              "Tools",
              table(
                [
                  { label: "Tool", value: (row) => row.tool, flex: 3 },
                  { label: "Calls", value: (row) => compactNumber(row.calls), flex: 1 },
                  { label: "Errors", value: (row) => String(row.errors), flex: 1 },
                ],
                view.tools,
                (row) => row.tool,
              ),
            )}
          </View>
        </View>
        <Text testID="omp-usage-footer" style={[styles.muted, view.syncProblem ? { color: c.statusWarning } : null]}>
          {view.syncProblem ? `OMP stats: ${view.syncProblem}. ` : ""}
          Newest request {view.lastEntryAt ? new Date(view.lastEntryAt).toLocaleString("en-GB") : "none"}. Bedrock requests from ~/.omp/stats.db.
        </Text>
      </>
    );
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={[styles.wrap, { justifyContent: "space-between" }]}>
        <View style={styles.wrap}>
          {RANGES.map((value) => (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityLabel={RANGE_LABELS[value]}
              aria-selected={value === range}
              onPress={() => setRange(value)}
              style={[styles.chip, { backgroundColor: value === range ? c.accent : c.surface2 }]}
            >
              <Text style={{ color: value === range ? c.accentForeground : c.foreground, fontSize: 13 }}>
                {RANGE_LABELS[value]}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh"
          disabled={refreshing}
          onPress={() => void refresh()}
          style={[styles.chip, { backgroundColor: c.surface2, opacity: refreshing ? 0.5 : 1 }]}
        >
          <Text style={{ color: c.foreground, fontSize: 13 }}>{refreshing ? "Refreshing..." : "Refresh"}</Text>
        </Pressable>
      </View>
      {data ? (
        body(data)
      ) : stats.error ? (
        <Text style={[styles.text, { color: c.statusDanger }]}>
          {stats.error instanceof Error ? stats.error.message : String(stats.error)}
        </Text>
      ) : (
        <Text style={styles.muted}>Loading...</Text>
      )}
    </ScrollView>
  );
}
