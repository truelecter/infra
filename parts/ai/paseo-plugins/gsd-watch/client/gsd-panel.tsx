import type { PluginWorkspacePanelProps } from "@getpaseo/plugin/client";
import { useRpc, useWorkspace } from "@getpaseo/plugin/client";
import { copyText, Icon, ScrollView, useToast } from "@getpaseo/plugin/client/react-native";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { getProject, type Badge, type Status } from "../shared/gsd.ts";

/** GSD writes `.planning/` while an agent works; the panel re-reads it this often while visible. */
const REFRESH_MS = 1500;

const BADGE_LABELS: Record<Badge, { icon: string; label: string }> = {
  discussed: { icon: "MessageSquare", label: "Discussed" },
  researched: { icon: "Search", label: "Researched" },
  ui_spec: { icon: "Palette", label: "UI spec" },
  planned: { icon: "ClipboardList", label: "Planned" },
  executed: { icon: "Rocket", label: "Executed" },
  verified: { icon: "BadgeCheck", label: "Verified" },
  uat: { icon: "FlaskConical", label: "UAT" },
};

const STATUS_ICONS: Record<Status, string> = { complete: "CircleCheck", in_progress: "CircleDot", pending: "Circle" };
const STATUS_LABELS: Record<Status, string> = { complete: "Complete", in_progress: "In progress", pending: "Pending" };

type Colors = PluginWorkspacePanelProps["theme"]["colors"];

function statusColor(status: Status, colors: Colors): string {
  if (status === "complete") return colors.statusSuccess;
  if (status === "in_progress") return colors.statusWarning;
  return colors.foregroundMuted;
}

export function GsdPanel({ theme, workspaceId }: PluginWorkspacePanelProps) {
  const directory = useWorkspace(workspaceId, (workspace) => workspace.directory);
  const readProject = useRpc(getProject);
  const toast = useToast();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [sections, setSections] = useState({ quick: false, milestones: false });

  const query = useQuery({
    queryKey: ["gsd-watch", directory],
    queryFn: () => readProject({ directory: directory ?? "" }),
    enabled: directory !== null,
    refetchInterval: REFRESH_MS,
  });

  const c = theme.colors;
  const styles = useMemo(
    () => ({
      screen: { flex: 1, backgroundColor: c.surface0 },
      content: { padding: 12, gap: 12 },
      card: { gap: 6, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: c.border, backgroundColor: c.surface1 },
      row: { flexDirection: "row" as const, alignItems: "center" as const, gap: 6 },
      wrap: { flexDirection: "row" as const, flexWrap: "wrap" as const, alignItems: "center" as const, gap: 4 },
      title: { color: c.foreground, fontSize: 15, fontWeight: "600" as const },
      text: { color: c.foreground, fontSize: 13 },
      muted: { color: c.foregroundMuted, fontSize: 12 },
      // iOS has no font named `monospace`; Menlo ships with it.
      mono: { color: c.foreground, fontSize: 12, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },
      chip: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 3,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        backgroundColor: c.surface2,
      },
      button: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: c.surface2 },
      bar: { flexDirection: "row" as const, height: 6, borderRadius: 3, overflow: "hidden" as const, backgroundColor: c.surface2 },
      sectionHeader: { flexDirection: "row" as const, alignItems: "center" as const, gap: 4, paddingVertical: 4 },
    }),
    [c],
  );

  if (directory === null) {
    return <View style={styles.screen} />;
  }

  const message = (text: string, detail?: string) => (
    <View style={[styles.screen, styles.content]}>
      <Text style={styles.text}>{text}</Text>
      {detail ? <Text style={styles.muted}>{detail}</Text> : null}
    </View>
  );

  if (query.isPending) return message("Reading .planning/");
  if (query.isError && !query.data) {
    return message("Could not read the GSD project.", query.error instanceof Error ? query.error.message : String(query.error));
  }
  const result = query.data;
  if (!result.found) {
    return message(`No GSD project in this workspace.`, `${result.planningDirectory} doesn't exist. Start one with /gsd-new-project.`);
  }
  const project = result.project;
  // Phases the user hasn't toggled: only the current one, or the first still in progress, is open.
  const open = (project.phases.find((phase) => phase.active) ?? project.phases.find((phase) => phase.status === "in_progress"))?.number ?? null;
  const plans = project.phases.flatMap((phase) => phase.plans);
  const plansDone = plans.filter((plan) => plan.status === "complete").length;
  const phasesDone = project.phases.filter((phase) => phase.status === "complete").length;
  const setAll = (value: boolean) => setExpanded(Object.fromEntries(project.phases.map((phase) => [phase.number, value])));

  const button = (label: string, onPress: () => void, icon?: string) => (
    <Pressable key={label} accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={[styles.button, styles.row, { gap: 4 }]}>
      {icon ? <Icon name={icon} size={12} color={c.foreground} /> : null}
      <Text style={{ color: c.foreground, fontSize: 12 }}>{label}</Text>
    </Pressable>
  );

  const sectionToggle = (key: keyof typeof sections, label: string) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${sections[key] ? "Collapse" : "Expand"} ${label}`}
      onPress={() => setSections((current) => ({ ...current, [key]: !current[key] }))}
      style={styles.sectionHeader}
    >
      <Icon name={sections[key] ? "ChevronDown" : "ChevronRight"} size={14} color={c.foregroundMuted} />
      <Text style={[styles.text, { fontWeight: "600" }]}>{label}</Text>
    </Pressable>
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} testID="gsd-watch-panel">
      <View style={styles.card} testID="gsd-watch-header">
        <Text style={styles.title}>{project.name}</Text>
        {project.milestone || project.status ? (
          <Text style={styles.muted}>{[project.milestone, project.status, project.modelProfile && `profile ${project.modelProfile}`].filter(Boolean).join(" · ")}</Text>
        ) : null}
        <View style={styles.bar}>
          <View style={{ flexGrow: plansDone, flexBasis: 0, backgroundColor: c.statusSuccess }} />
          <View style={{ flexGrow: Math.max(plans.length - plansDone, plans.length === 0 ? 1 : 0), flexBasis: 0 }} />
        </View>
        <Text style={styles.muted}>
          {plansDone}/{plans.length} plans · {phasesDone}/{project.phases.length} phases
        </Text>
        {project.stoppedAt ? <Text style={styles.text}>Stopped at: {project.stoppedAt}</Text> : null}
        {project.lastActivity && !project.stoppedAt ? <Text style={styles.text}>{project.lastActivity}</Text> : null}
        {project.next ? (
          <View style={[styles.row, { flexWrap: "wrap" }]} testID="gsd-watch-next">
            <Text style={styles.muted}>Next:</Text>
            <Text style={styles.mono}>{project.next.command}</Text>
            {button("Copy", () => {
              const command = project.next?.command ?? "";
              void copyText(command).then(
                () => toast.show(`Copied ${command}`, { variant: "success" }),
                (error: unknown) => toast.error(error instanceof Error ? error.message : String(error)),
              );
            }, "Copy")}
          </View>
        ) : null}
        {project.next?.reason ? <Text style={styles.muted}>{project.next.reason}</Text> : null}
      </View>

      {project.phases.length > 0 ? (
        <View style={styles.row}>
          {button("Expand all", () => setAll(true))}
          {button("Collapse all", () => setAll(false))}
        </View>
      ) : (
        <Text style={styles.muted}>No phases yet: ROADMAP.md lists none and .planning/phases/ is empty.</Text>
      )}

      <View style={{ gap: 4 }} testID="gsd-watch-phases">
        {project.phases.map((phase) => {
          const done = phase.plans.filter((plan) => plan.status === "complete").length;
          const showPlans = expanded[phase.number] ?? phase.number === open;
          return (
            <View key={phase.number} style={[styles.card, phase.active ? { borderColor: c.accent } : null]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Phase ${phase.number}: ${phase.name}, ${STATUS_LABELS[phase.status]}`}
                accessibilityState={{ expanded: showPlans }}
                onPress={() => setExpanded((current) => ({ ...current, [phase.number]: !showPlans }))}
                style={[styles.row, { alignItems: "flex-start" }]}
              >
                <Icon name={STATUS_ICONS[phase.status]} size={16} color={statusColor(phase.status, c)} />
                <Text style={[styles.text, { flex: 1, fontWeight: phase.active ? "600" : "400" }]}>
                  {phase.number}. {phase.name}
                </Text>
                {phase.plans.length > 0 ? <Text style={styles.muted}>{done}/{phase.plans.length}</Text> : null}
                <Icon name={showPlans ? "ChevronDown" : "ChevronRight"} size={14} color={c.foregroundMuted} />
              </Pressable>
              {phase.badges.length > 0 ? (
                <View style={styles.wrap}>
                  {phase.badges.map((badge) => (
                    <View key={badge} style={styles.chip} accessibilityLabel={BADGE_LABELS[badge].label}>
                      <Icon name={BADGE_LABELS[badge].icon} size={11} color={c.foregroundMuted} />
                      <Text style={{ color: c.foregroundMuted, fontSize: 11 }}>{BADGE_LABELS[badge].label}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              {showPlans && phase.plans.length === 0 ? <Text style={styles.muted}>No plans yet.</Text> : null}
              {showPlans
                ? phase.plans.map((plan) => (
                    <View
                      key={plan.id}
                      style={[styles.row, { alignItems: "flex-start", paddingLeft: 8, paddingVertical: 2, borderRadius: 4 }, plan.active ? { backgroundColor: c.surface2 } : null]}
                      accessibilityLabel={`Plan ${plan.id}, ${STATUS_LABELS[plan.status]}${plan.active ? ", current" : ""}`}
                    >
                      <Icon name={plan.active ? "Play" : STATUS_ICONS[plan.status]} size={13} color={plan.active ? c.accent : statusColor(plan.status, c)} />
                      <Text style={styles.mono}>{plan.id}</Text>
                      <Text style={[styles.text, { flex: 1, fontSize: 12 }]} numberOfLines={2}>
                        {plan.title}
                      </Text>
                      {plan.wave !== null ? <Text style={styles.muted}>w{plan.wave}</Text> : null}
                    </View>
                  ))
                : null}
            </View>
          );
        })}
      </View>

      {project.quickTasks.length > 0 ? (
        <View testID="gsd-watch-quick">
          {sectionToggle("quick", `Quick tasks (${project.quickTasks.length})`)}
          {sections.quick
            ? project.quickTasks.map((task) => (
                <View key={task.id} style={[styles.row, { alignItems: "flex-start", paddingLeft: 8, paddingVertical: 2 }]}>
                  <Icon name={STATUS_ICONS[task.status]} size={13} color={statusColor(task.status, c)} />
                  <Text style={[styles.text, { flex: 1, fontSize: 12 }]} numberOfLines={2}>
                    {task.title}
                  </Text>
                  <Text style={styles.muted}>{task.date}</Text>
                </View>
              ))
            : null}
        </View>
      ) : null}

      {project.milestones.length > 0 ? (
        <View testID="gsd-watch-milestones">
          {sectionToggle("milestones", `Archived milestones (${project.milestones.length})`)}
          {sections.milestones
            ? project.milestones.map((milestone) => (
                <View key={milestone.version} style={[styles.row, { paddingLeft: 8, paddingVertical: 2 }]}>
                  <Icon name="Archive" size={13} color={c.foregroundMuted} />
                  <Text style={[styles.text, { fontSize: 12 }]}>{milestone.version}</Text>
                  <Text style={styles.muted}>
                    {milestone.phaseCount} phases{milestone.shipped ? ` · shipped ${milestone.shipped}` : ""}
                  </Text>
                </View>
              ))
            : null}
        </View>
      ) : null}

      <Text style={styles.muted}>
        {query.isError ? "Refresh failed; showing the last read. " : ""}Updated {new Date(query.dataUpdatedAt).toLocaleTimeString()}
      </Text>
    </ScrollView>
  );
}
