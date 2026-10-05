import type { PluginSurfaceProps } from "@getpaseo/plugin/client";
import { useRpc, useSettings } from "@getpaseo/plugin/client";
import { Icon, Modal, ScrollView, useToast } from "@getpaseo/plugin/client/react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState, type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import {
  archiveAgent,
  getSnapshot,
  killProcess,
  quitApp,
  REFRESH_CHOICES,
  screenSettings,
  type AppGroup,
  type ProcessRow,
  type Session,
  type Snapshot,
} from "../shared/health.ts";
import { formatBytes, formatDuration, formatRate } from "./format.ts";

const SNAPSHOT_KEY = ["system-health-snapshot"];

interface Confirmation {
  title: string;
  message: string;
  action: string;
  run: () => Promise<unknown>;
}

export function HealthScreen({ theme, layout }: PluginSurfaceProps) {
  const toast = useToast();
  const readSnapshot = useRpc(getSnapshot);
  const archiveRpc = useRpc(archiveAgent);
  const quitRpc = useRpc(quitApp);
  const killRpc = useRpc(killProcess);
  const settings = useSettings(screenSettings);
  const refreshSeconds = settings.status === "ready" ? settings.values.refreshSeconds : 0;
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  // A sample takes about three seconds (top needs two readings); the interval counts from the last answer.
  const snapshot = useQuery({
    queryKey: SNAPSHOT_KEY,
    queryFn: () => readSnapshot({}),
    refetchInterval: refreshSeconds ? refreshSeconds * 1000 : false,
    refetchOnWindowFocus: false,
  });

  const action = useMutation({
    mutationFn: (run: () => Promise<unknown>) => run(),
    onSuccess: () => void snapshot.refetch(),
    onError: (error) => toast.error(error instanceof Error ? error.message : String(error)),
  });

  const c = theme.colors;
  const styles = useMemo(
    () => ({
      screen: { flex: 1, backgroundColor: c.surface0 },
      content: {
        padding: layout.compact ? 12 : 24,
        gap: 16,
        maxWidth: 960,
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
      row: { flexDirection: "row" as const, flexWrap: "wrap" as const, gap: 8, alignItems: "center" as const },
      spread: { flexDirection: "row" as const, justifyContent: "space-between" as const, alignItems: "center" as const, gap: 8 },
      // Card headers: the description drops below the title when the screen is narrow.
      header: {
        flexDirection: "row" as const,
        flexWrap: "wrap" as const,
        justifyContent: "space-between" as const,
        alignItems: "baseline" as const,
        columnGap: 12,
        rowGap: 2,
      },
      title: { color: c.foreground, fontSize: 16, fontWeight: "600" as const },
      text: { color: c.foreground, fontSize: 14 },
      muted: { color: c.foregroundMuted, fontSize: 13 },
      number: { color: c.foreground, fontSize: 13, fontVariant: ["tabular-nums" as const], textAlign: "right" as const },
      button: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
      bar: { flexDirection: "row" as const, height: 10, borderRadius: 5, overflow: "hidden" as const, backgroundColor: c.surface2 },
    }),
    [c, layout.compact],
  );

  const button = (label: string, onPress: () => void, options: { primary?: boolean; danger?: boolean; disabled?: boolean } = {}) => {
    const disabled = options.disabled || action.isPending;
    const background = options.primary ? c.accent : options.danger ? c.statusDanger : c.surface2;
    return (
      <Pressable
        key={label}
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={disabled}
        onPress={onPress}
        style={[styles.button, { backgroundColor: background, opacity: disabled ? 0.5 : 1 }]}
      >
        <Text style={{ color: options.primary || options.danger ? c.accentForeground : c.foreground, fontSize: 13 }}>
          {label}
        </Text>
      </Pressable>
    );
  };

  const confirm = (next: Confirmation) => setConfirmation(next);
  const toggle = (key: string) => setExpanded((current) => ({ ...current, [key]: !current[key] }));

  const segments = (parts: { bytes: number; color: string }[], total: number) => (
    <View style={styles.bar}>
      {parts.map((part, index) =>
        part.bytes > 0 ? (
          <View key={index} style={{ flexGrow: part.bytes / Math.max(total, 1), flexBasis: 0, backgroundColor: part.color }} />
        ) : null,
      )}
      <View style={{ flexGrow: Math.max(0, 1 - parts.reduce((sum, part) => sum + part.bytes, 0) / Math.max(total, 1)), flexBasis: 0 }} />
    </View>
  );

  const legend = (items: { label: string; value: string; color: string }[]) => (
    <View style={styles.row}>
      {items.map((item) => (
        <View key={item.label} style={[styles.row, { gap: 4, marginRight: 8 }]}>
          <View style={{ width: 10, height: 10, borderRadius: 2, borderWidth: 1, borderColor: c.border, backgroundColor: item.color }} />
          <Text style={styles.muted}>
            {item.label} <Text style={styles.text}>{item.value}</Text>
          </Text>
        </View>
      ))}
    </View>
  );

  const pressureColor = (pressure: Snapshot["memory"]["pressure"]) =>
    pressure === "normal" ? c.statusSuccess : pressure === "warning" ? c.statusWarning : pressure === "critical" ? c.statusDanger : c.foregroundMuted;

  const memoryCard = (data: Snapshot) => {
    const m = data.memory;
    const swapShare = m.swapTotalBytes ? m.swapUsedBytes / m.swapTotalBytes : 0;
    const loadHigh = data.cpu.load[0] > data.cpu.cores;
    return (
      <View style={styles.card} testID="system-health-memory">
        <View style={styles.header}>
          <Text style={styles.title}>Memory</Text>
          <Text style={[styles.text, { color: pressureColor(m.pressure), fontWeight: "600" }]}>
            Pressure: {m.pressure}
            {m.availablePercent === null ? "" : `, ${m.availablePercent}% available`}
          </Text>
        </View>
        {/* Free memory and whatever the counters don't cover are the empty rest of the bar. */}
        {segments(
          [
            { bytes: m.wiredBytes, color: c.foregroundMuted },
            { bytes: m.appBytes, color: c.accent },
            { bytes: m.compressorBytes, color: c.statusWarning },
            { bytes: m.cachedBytes, color: c.border },
          ],
          m.totalBytes,
        )}
        {legend([
          { label: "Wired", value: formatBytes(m.wiredBytes), color: c.foregroundMuted },
          { label: "App", value: formatBytes(m.appBytes), color: c.accent },
          {
            label: "Compressor",
            value: `${formatBytes(m.compressorBytes)} (holds ${formatBytes(m.compressedBytes)})`,
            color: c.statusWarning,
          },
          { label: "Cached files", value: formatBytes(m.cachedBytes), color: c.border },
          { label: "Free", value: formatBytes(m.freeBytes), color: c.surface2 },
        ])}
        <Text style={styles.muted}>of {formatBytes(m.totalBytes)} physical memory</Text>

        <View style={styles.spread}>
          <Text style={styles.text}>Swap</Text>
          <Text style={[styles.text, { color: swapShare > 0.8 ? c.statusDanger : c.foreground }]}>
            {formatBytes(m.swapUsedBytes)} of {formatBytes(m.swapTotalBytes)}
          </Text>
        </View>
        {segments([{ bytes: m.swapUsedBytes, color: swapShare > 0.8 ? c.statusDanger : c.statusWarning }], m.swapTotalBytes)}
        <Text style={styles.muted}>
          Over {data.sampleSeconds} s: swap in{" "}
          <Text style={[styles.text, { color: m.rates.swapinsPerSec > 100 ? c.statusDanger : c.foreground }]}>
            {formatRate(m.rates.swapinsPerSec)}
          </Text>
          , swap out <Text style={styles.text}>{formatRate(m.rates.swapoutsPerSec)}</Text>, page in{" "}
          <Text style={styles.text}>{formatRate(m.rates.pageinsPerSec)}</Text>, compress{" "}
          <Text style={styles.text}>{formatRate(m.rates.compressionsPerSec)}</Text>, decompress{" "}
          <Text style={styles.text}>{formatRate(m.rates.decompressionsPerSec)}</Text> (pages)
        </Text>

        <View style={styles.spread}>
          <Text style={styles.text}>CPU</Text>
          <Text style={[styles.text, { color: loadHigh ? c.statusWarning : c.foreground }]}>
            Load {data.cpu.load.map((value) => value.toFixed(1)).join(" / ")} on {data.cpu.cores} cores
          </Text>
        </View>
        {segments(
          [
            { bytes: data.cpu.userPercent, color: c.accent },
            { bytes: data.cpu.sysPercent, color: c.statusDanger },
          ],
          100,
        )}
        {legend([
          { label: "User", value: `${data.cpu.userPercent.toFixed(0)}%`, color: c.accent },
          { label: "System", value: `${data.cpu.sysPercent.toFixed(0)}%`, color: c.statusDanger },
          { label: "Idle", value: `${data.cpu.idlePercent.toFixed(0)}%`, color: c.surface2 },
        ])}
      </View>
    );
  };

  // Fixed columns, so every row of every card lines up; `extra` is a process count or an action button.
  const numbers = (memBytes: number, compressedBytes: number, cpuPercent: number, extra?: ReactNode) => (
    <View style={[styles.row, { flexWrap: "nowrap", gap: layout.compact ? 8 : 12 }]}>
      <Text style={[styles.number, { width: layout.compact ? 62 : 70 }]}>{formatBytes(memBytes)}</Text>
      {layout.compact ? null : (
        <Text style={[styles.number, { width: 110, color: c.foregroundMuted }]}>
          {compressedBytes ? `${formatBytes(compressedBytes)} cmpr` : ""}
        </Text>
      )}
      <Text style={[styles.number, { width: layout.compact ? 46 : 54 }]}>{cpuPercent.toFixed(1)}%</Text>
      <View style={{ width: layout.compact ? 52 : 60, alignItems: "flex-end" }}>
        {typeof extra === "string" ? <Text style={[styles.number, { color: c.foregroundMuted }]}>{extra}</Text> : extra}
      </View>
    </View>
  );

  const processLine = (process: ProcessRow) => (
    <View key={process.pid} style={[styles.spread, { paddingLeft: 16 }]}>
      <Text style={[styles.muted, { flexShrink: 1 }]} numberOfLines={1}>
        {process.name} <Text style={{ color: c.foregroundMuted }}>({process.pid}, {formatDuration(process.ageSeconds)})</Text>
      </Text>
      {numbers(process.memBytes, process.compressedBytes, process.cpuPercent)}
    </View>
  );

  const appRow = (app: AppGroup, largest: number) => {
    const key = `app:${app.kind}:${app.bundlePath ?? app.name}`;
    const open = !!expanded[key];
    const canQuit = app.kind === "app" && app.bundlePath && app.name !== "Paseo";
    return (
      <View key={key} style={{ gap: 6 }}>
        <Pressable accessibilityRole="button" accessibilityLabel={`${app.name} details`} onPress={() => toggle(key)}>
          <View style={styles.spread}>
            <View style={{ flex: 1, gap: 4 }}>
              <View style={[styles.row, { flexWrap: "nowrap", gap: 4 }]}>
                <View style={{ flexShrink: 0 }}>
                  <Icon name={open ? "ChevronDown" : "ChevronRight"} size={14} color={c.foregroundMuted} />
                </View>
                <Text style={[styles.text, { flexShrink: 1 }]} numberOfLines={1}>
                  {app.name}
                  {app.kind === "agents" && !layout.compact ? <Text style={styles.muted}> (see Agent sessions)</Text> : null}
                </Text>
              </View>
              {segments([{ bytes: app.memBytes, color: app.kind === "agents" ? c.statusWarning : c.accent }], largest)}
            </View>
            {numbers(app.memBytes, app.compressedBytes, app.cpuPercent, `${app.processCount} proc`)}
          </View>
        </Pressable>
        {open ? (
          <View style={{ gap: 4 }}>
            {app.processes.map((process) => processLine(process))}
            {app.processCount > app.processes.length ? (
              <Text style={[styles.muted, { paddingLeft: 16 }]}>and {app.processCount - app.processes.length} smaller</Text>
            ) : null}
            {canQuit ? (
              <View style={[styles.row, { paddingLeft: 16 }]}>
                {button(`Quit ${app.name}`, () =>
                  confirm({
                    title: `Quit ${app.name}?`,
                    message: `${app.name} is asked to quit, the same as Quit in its menu. It may ask to save open documents first.`,
                    action: "Quit",
                    run: () => quitRpc({ bundlePath: app.bundlePath! }),
                  }),
                )}
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  };

  const appsCard = (data: Snapshot) => {
    const largest = data.apps[0]?.memBytes ?? 1;
    return (
      <View style={styles.card} testID="system-health-apps">
        <View style={styles.header}>
          <Text style={styles.title}>Apps by memory</Text>
          <Text style={[styles.muted, { flexShrink: 1 }]}>footprint incl. compressed and swapped, CPU over {data.sampleSeconds} s</Text>
        </View>
        {data.apps.map((app) => appRow(app, largest))}
        {data.otherAppsCount ? (
          <Text style={styles.muted}>
            {data.otherAppsCount} more, {formatBytes(data.otherAppsBytes)} together
          </Text>
        ) : null}
      </View>
    );
  };

  const sessionRow = (session: Session) => {
    const key = `session:${session.pid}`;
    const open = !!expanded[key];
    const live = !!session.agentId && !session.archived;
    const idleFor = session.lastActivityAt ? (Date.now() - Date.parse(session.lastActivityAt)) / 1000 : null;
    const name = session.title ?? (session.agentId ? session.agentId : "No Paseo agent");
    const details = [
      session.archived ? "archived" : session.status,
      idleFor === null || session.status === "running" ? null : `idle ${formatDuration(idleFor)}`,
      `up ${formatDuration(session.ageSeconds)}`,
      session.ompVersion ? `omp ${session.ompVersion}` : null,
      `pid ${session.pid}`,
    ].filter(Boolean);
    return (
      <View key={key} style={{ gap: 6 }}>
        <Pressable accessibilityRole="button" accessibilityLabel={`${name} details`} onPress={() => toggle(key)}>
          <View style={styles.spread}>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={[styles.row, { flexWrap: "nowrap", gap: 4 }]}>
                <View style={{ flexShrink: 0 }}>
                  <Icon name={open ? "ChevronDown" : "ChevronRight"} size={14} color={c.foregroundMuted} />
                </View>
                <Text style={[styles.text, { flexShrink: 1, color: live ? c.foreground : c.statusWarning }]} numberOfLines={1}>
                  {name}
                </Text>
              </View>
              <Text style={styles.muted} numberOfLines={1}>
                {details.join(", ")}
                {session.outdated ? <Text style={{ color: c.statusDanger }}>, old omp binary</Text> : null}
              </Text>
            </View>
            {numbers(session.memBytes, session.compressedBytes, session.cpuPercent, `${session.children.length + 1} proc`)}
          </View>
        </Pressable>
        {open ? (
          <View style={{ gap: 4 }}>
            {session.cwd ? <Text style={[styles.muted, { paddingLeft: 16 }]}>{session.cwd}</Text> : null}
            {session.children.map((child) => processLine(child))}
            <View style={[styles.row, { paddingLeft: 16 }]}>
              {live && session.status !== "running"
                ? button("Archive agent", () =>
                    confirm({
                      title: `Archive ${name}?`,
                      message: "Paseo archives the agent and stops its session. The chat stays in the archive.",
                      action: "Archive",
                      run: () => archiveRpc({ agentId: session.agentId! }),
                    }),
                  )
                : null}
              {live
                ? null
                : button("Kill session", () =>
                    confirm({
                      title: `Kill omp session ${session.pid}?`,
                      message: session.agentId
                        ? "Its agent is archived but the session is still running. It gets SIGTERM."
                        : "No Paseo agent matches this session. It gets SIGTERM.",
                      action: "Kill",
                      run: () => killRpc({ pid: session.pid, name: "omp" }),
                    }),
                  )}
            </View>
          </View>
        ) : null}
      </View>
    );
  };

  const agentsCard = (data: Snapshot) => {
    const a = data.agents;
    const outdated = a.sessions.filter((session) => session.outdated).length;
    const unmatched = a.sessions.filter((session) => !session.agentId || session.archived).length;
    const total = a.sessions.reduce((sum, session) => sum + session.memBytes, 0);
    return (
      <View style={styles.card} testID="system-health-agents">
        <View style={styles.spread}>
          <Text style={styles.title}>Agent sessions</Text>
          <Text style={styles.text}>{formatBytes(total)}</Text>
        </View>
        <Text style={styles.muted}>
          {a.sessions.length} omp sessions running; Paseo has {a.liveAgents} agents, {a.archivedAgents} archived.
          {a.installedOmpVersion ? ` Installed omp ${a.installedOmpVersion}.` : ""}
          {outdated ? <Text style={{ color: c.statusDanger }}> {outdated} on an old binary.</Text> : null}
          {unmatched ? <Text style={{ color: c.statusWarning }}> {unmatched} without a live agent.</Text> : null}
        </Text>
        {a.error ? <Text style={[styles.muted, { color: c.statusDanger }]}>Could not read Paseo's agents: {a.error}</Text> : null}
        {a.sessions.map(sessionRow)}
      </View>
    );
  };

  const outliersCard = (data: Snapshot) => (
    <View style={styles.card} testID="system-health-outliers">
      <View style={styles.header}>
        <Text style={styles.title}>Long-running outliers</Text>
        <Text style={[styles.muted, { flexShrink: 1 }]}>up a day or more, 500 MB or more (50 MB if detached)</Text>
      </View>
      {data.outliers.length === 0 ? <Text style={styles.muted}>None.</Text> : null}
      {data.outliers.map((outlier) => (
        <View key={outlier.pid} style={styles.spread}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.text} numberOfLines={1}>
              {outlier.name}
              {outlier.app !== outlier.name ? <Text style={styles.muted}> in {outlier.app}</Text> : null}
            </Text>
            <Text style={styles.muted}>
              up {formatDuration(outlier.ageSeconds)}, pid {outlier.pid}
              {outlier.detached ? <Text style={{ color: c.statusWarning }}>, detached (parent is launchd)</Text> : null}
            </Text>
          </View>
          {numbers(
            outlier.memBytes,
            outlier.compressedBytes,
            outlier.cpuPercent,
            outlier.killable
              ? button("Kill", () =>
                  confirm({
                    title: `Kill ${outlier.name}?`,
                    message: `Process ${outlier.pid} gets SIGTERM. Unsaved work in it is lost.`,
                    action: "Kill",
                    run: () => killRpc({ pid: outlier.pid, name: outlier.name }),
                  }),
                )
              : null,
          )}
        </View>
      ))}
    </View>
  );

  const data = snapshot.data;
  const sampling = snapshot.isFetching;
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={[styles.spread, { flexWrap: "wrap" }]}>
        <View style={{ gap: 2 }}>
          <Text style={[styles.title, { fontSize: 18 }]}>System health</Text>
          <Text style={styles.muted}>
            {sampling ? "Sampling" : data ? `Sampled ${new Date(data.sampledAt).toLocaleTimeString()}` : ""}
          </Text>
        </View>
        <View style={styles.row}>
          {button(sampling ? "Sampling" : "Refresh", () => void snapshot.refetch(), { primary: true, disabled: sampling })}
          <Text style={styles.muted}>Auto</Text>
          {REFRESH_CHOICES.map((seconds) => {
            const selected = seconds === refreshSeconds;
            return (
              <Pressable
                key={seconds}
                accessibilityRole="button"
                accessibilityLabel={seconds ? `Refresh every ${seconds} seconds` : "No automatic refresh"}
                aria-selected={selected}
                disabled={settings.status !== "ready" || settings.saving}
                onPress={() => {
                  if (settings.status === "ready") void settings.save({ refreshSeconds: seconds }, settings.revision);
                }}
                style={[styles.button, { paddingHorizontal: 10, backgroundColor: selected ? c.accent : c.surface2 }]}
              >
                <Text style={{ color: selected ? c.accentForeground : c.foreground, fontSize: 13 }}>
                  {seconds ? `${seconds}s` : "Off"}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {snapshot.isPending ? <Text style={styles.muted}>Sampling for a few seconds</Text> : null}
      {snapshot.isError ? (
        <Text style={[styles.text, { color: c.statusDanger }]}>
          {snapshot.error instanceof Error ? snapshot.error.message : String(snapshot.error)}
        </Text>
      ) : null}

      {data ? (
        <>
          {memoryCard(data)}
          {appsCard(data)}
          {agentsCard(data)}
          {outliersCard(data)}
        </>
      ) : null}

      <Modal title={confirmation?.title ?? ""} open={!!confirmation} onOpenChange={(open) => !open && setConfirmation(null)}>
        <Modal.Content>
          <Text style={styles.text}>{confirmation?.message}</Text>
          <View style={styles.row}>
            {button(confirmation?.action ?? "OK", () => {
              const run = confirmation?.run;
              setConfirmation(null);
              if (run) action.mutate(run);
            }, { danger: true })}
            {button("Cancel", () => setConfirmation(null))}
          </View>
        </Modal.Content>
      </Modal>
    </ScrollView>
  );
}
