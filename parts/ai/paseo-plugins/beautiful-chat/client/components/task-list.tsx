import React, { useState, useMemo, useEffect, useRef, useCallback, type ReactNode } from "react";
import { View, Text, Pressable, StyleSheet, Animated } from "react-native";
import { Glyph } from "./glyph";
import { frosted } from "./frosted";
import { surfaceProps } from "./view-props";
import { glowing } from "./glow";
import { Glow, Rotate } from "./motion";
import { Breathe } from "./breathe";
import { PulseDot } from "./pulse-dot";
import { radius } from "./theme-tokens";
import { selectableSurface, unselectable } from "./selection";
import { selectionSurface } from "./selection-actions";
import type { ExtendedThemeTokens } from "./theme-tokens";
import type { TaskListData, TaskItemData, TaskStatus } from "../../shared/contracts";

interface TaskListProps {
  data: TaskListData;
  tokens: ExtendedThemeTokens;
  onToggleTask?: (taskId: string, newStatus: TaskStatus) => void;
  /**
   * Folds the card to one header line that shows this in place of the title.
   * Pressing the header unfolds the progress bar and the tasks.
   */
  summary?: ReactNode;
}

export function TaskList({ data, tokens, onToggleTask, summary }: TaskListProps) {
  const [tasks, setTasks] = useState<TaskItemData[]>(data.tasks);
  // The host updates a row in place when a call changes nothing it files a
  // row for, so a new list can arrive for a card already on screen.
  useEffect(() => setTasks(data.tasks), [data.tasks]);
  const [expandedBlockedId, setExpandedBlockedId] = useState<string | null>(null);
  const foldable = summary !== undefined;
  const [expanded, setExpanded] = useState(!foldable);

  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const totalCount = tasks.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isWorking = tasks.some((task) => task.status === "in_progress");

  // Progress slides to its new value; a bar that snaps reads as a glitch.
  const progress = useRef(new Animated.Value(progressPercent)).current;
  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: progressPercent,
      duration: 320,
      useNativeDriver: false,
    });
    animation.start();
    return () => {
      animation.stop();
    };
  }, [progressPercent, progress]);
  const animatedWidth = progress.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  // Tasks use the same measured rail as reasoning steps. Rows can grow when
  // they carry a blocker, so a percentage-based line stops between markers.
  const [tickCentres, setTickCentres] = useState<number[]>([]);
  const recordTick = useCallback((index: number, y: number) => {
    setTickCentres((current) => {
      const centre = y + 11;
      if (current[index] === centre) return current;
      const next = current.slice();
      next[index] = centre;
      return next;
    });
  }, []);
  const reachedIndex = useMemo(() => {
    let last = -1;
    tasks.forEach((task, index) => {
      if (task.status === "completed" || task.status === "in_progress") {
        last = index;
      }
    });
    return last;
  }, [tasks]);
  const railHeight = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const target = reachedIndex >= 0 ? (tickCentres[reachedIndex] ?? 0) : 0;
    const animation = Animated.timing(railHeight, {
      toValue: target,
      duration: 420,
      useNativeDriver: false,
    });
    animation.start();
    return () => {
      animation.stop();
    };
  }, [reachedIndex, tickCentres, railHeight]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          marginVertical: 10,
          borderRadius: radius.card,
          backgroundColor: tokens.surfaceGlass,
          borderWidth: 1,
          borderColor: tokens.borderSubtle,
          overflow: "hidden",
          ...tokens.boxShadow,
          ...selectableSurface,
        },
        containerFolded: {
          marginVertical: 4,
        },
        headerFolded: {
          paddingTop: 9,
          paddingBottom: 9,
          borderBottomWidth: 0,
        },
        headerTopFolded: {
          marginBottom: 0,
        },
        header: {
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderBottomColor: tokens.borderSubtle,
          backgroundColor: tokens.surfaceGlass,
        },
        headerTop: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        },
        headerLeft: {
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          flex: 1,
        },
        iconBubble: {
          width: 22,
          height: 22,
          borderRadius: radius.block,
          backgroundColor: tokens.surface2,
          alignItems: "center",
          justifyContent: "center",
        },
        titleContainer: {
          flexDirection: "column",
          gap: 2,
          flex: 1,
        },
        titleGroup: {
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        },
        icon: {
          fontFamily: tokens.fontUi,
          fontSize: 16,
        },
        phaseBadge: {
          fontFamily: tokens.fontUi,
          fontSize: 11,
          fontWeight: "600",
          textTransform: "uppercase",
          letterSpacing: 0.5,
          color: tokens.accent,
          backgroundColor: tokens.accentBg,
          paddingHorizontal: 8,
          paddingVertical: 2,
          borderRadius: radius.chip,
        },
        headerTitle: {
          fontFamily: tokens.fontUi,
          fontSize: 14,
          fontWeight: "700",
          color: tokens.foreground,
        },
        progressRatio: {
          fontSize: 12,
          fontWeight: "600",
          fontFamily: tokens.fontUi,
          color: tokens.foregroundMuted,
        },
        headerRight: {
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        },
        statusRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
        },
        statusText: {
          fontFamily: tokens.fontUi,
          fontSize: 11,
          fontWeight: "600",
          color: tokens.accent,
        },
        progressBarBackground: {
          height: 6,
          borderRadius: radius.block,
          backgroundColor: tokens.surface1,
          overflow: "hidden",
        },
        progressBarFill: {
          height: "100%",
          borderRadius: radius.block,
          backgroundColor: tokens.success,
        },
        listBody: {
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 16,
          backgroundColor: tokens.surfaceGlass,
        },
        timelineContainer: {
          position: "relative",
          paddingLeft: 20,
        },
        timelineRail: {
          position: "absolute",
          left: 6,
          top: 8,
          width: 2,
          backgroundColor: tokens.borderSubtle,
        },
        taskRow: {
          position: "relative",
          marginBottom: 16,
        },
        taskRowBlocked: {
          padding: 8,
          marginLeft: -8,
          borderRadius: radius.block,
          backgroundColor: tokens.warningBg,
        },
        taskDot: {
          position: "absolute",
          left: -20,
          top: 4,
          width: 14,
          height: 14,
          alignItems: "center",
          justifyContent: "center",
        },
        taskContent: {
          flex: 1,
          flexDirection: "column",
          gap: 4,
        },
        taskTitle: {
          fontFamily: tokens.fontUi,
          fontSize: 13,
          lineHeight: 18,
          color: tokens.foreground,
        },
        taskTitleCompleted: {
          color: tokens.foregroundSubtle,
          textDecorationLine: "line-through",
        },
        taskTitleActive: {
          fontWeight: "600",
          color: tokens.foreground,
        },
        taskFooterRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        },
        statusLabel: {
          fontFamily: tokens.fontUi,
          fontSize: 10,
          fontWeight: "600",
          textTransform: "uppercase",
          letterSpacing: 0.5,
        },
        durationBadge: {
          fontSize: 11,
          fontFamily: tokens.fontUi,
          color: tokens.foregroundSubtle,
        },
        blockedReasonBox: {
          marginTop: 6,
          padding: 8,
          borderRadius: radius.block,
          backgroundColor: tokens.surfaceGlass,
          borderWidth: 1,
          borderColor: tokens.warningBorder,
        },
        blockedReasonText: {
          fontFamily: tokens.fontUi,
          fontSize: 12,
          color: tokens.warning,
          lineHeight: 16,
        },
      }),
    [tokens],
  );

  const toggleStatus = (task: TaskItemData) => {
    let nextStatus: TaskStatus = "pending";
    if (task.status === "pending") nextStatus = "in_progress";
    else if (task.status === "in_progress") nextStatus = "completed";
    else if (task.status === "completed") nextStatus = "pending";

    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t)));
    onToggleTask?.(task.id, nextStatus);
  };

  // A folded card is one of many rows in the chat, each holding the list as
  // it stood then; only an unfolded card should pulse for a running task.
  const showWorking = isWorking && expanded;

  return (
    <View
      {...surfaceProps(frosted, glowing(tokens.isDark), selectionSurface)}
      style={[styles.container, foldable && styles.containerFolded]}
    >
      <Pressable
        disabled={!foldable}
        accessibilityRole={foldable ? "button" : undefined}
        accessibilityState={foldable ? { expanded } : undefined}
        onPress={() => setExpanded((open) => !open)}
        style={[styles.header, !expanded && styles.headerFolded]}
      >
        <View style={[styles.headerTop, !expanded && styles.headerTopFolded]}>
          <View style={styles.headerLeft}>
            <View style={styles.iconBubble}>
              <Breathe active={showWorking}>
                <Glyph name="ListChecks" size={15} color={tokens.accent} />
              </Breathe>
            </View>
            <View style={styles.titleContainer}>
              {foldable ? (
                summary
              ) : (
                <View style={styles.titleGroup}>
                  <Text selectable style={styles.headerTitle}>
                    {data.phaseName}
                  </Text>
                  <Text selectable style={styles.phaseBadge}>
                    OMP todo
                  </Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.headerRight}>
            {showWorking ? (
              <View style={styles.statusRow}>
                <PulseDot color={tokens.accent} size={6} />
                <Text selectable style={styles.statusText}>
                  Tasks
                </Text>
              </View>
            ) : null}
            <Text selectable style={styles.progressRatio}>
              {foldable
                ? `${completedCount}/${totalCount}`
                : `${completedCount}/${totalCount} (${progressPercent}%)`}
            </Text>
            {foldable ? (
              <Rotate active={expanded}>
                <Glyph name="ChevronDown" size={14} color={tokens.foregroundMuted} />
              </Rotate>
            ) : null}
          </View>
        </View>

        {expanded ? (
          <View style={styles.progressBarBackground}>
            <Animated.View style={[styles.progressBarFill, { width: animatedWidth }]} />
          </View>
        ) : null}
      </Pressable>

      {expanded ? (
      <View style={styles.listBody}>
        <View style={styles.timelineContainer}>
          <Animated.View style={[styles.timelineRail, { height: railHeight }]} />
          {tasks.map((task, taskIndex) => {
            const isDone = task.status === "completed";
            const isActive = task.status === "in_progress";
            const isBlocked = task.status === "blocked";
            const isBlockedOpen = expandedBlockedId === task.id;

            return (
              <View
                key={task.id}
                style={[styles.taskRow, isBlocked && styles.taskRowBlocked]}
                onLayout={(event) => recordTick(taskIndex, event.nativeEvent.layout.y)}
              >
                <Pressable
                  accessibilityLabel={`Set ${task.title} status`}
                  onPress={() => toggleStatus(task)}
                  style={styles.taskDot}
                >
                  {isDone ? (
                    <Glyph name="CheckCircle" size={13} color={tokens.success} />
                  ) : isBlocked ? (
                    <Glyph name="AlertCircle" size={13} color={tokens.warning} />
                  ) : (
                    <Glow active={isActive} color={tokens.accent} size={22}>
                      <Glyph
                        name="Circle"
                        size={13}
                        color={isActive ? tokens.accent : tokens.foregroundSubtle}
                      />
                    </Glow>
                  )}
                </Pressable>

                <View style={styles.taskContent}>
                  <Pressable onPress={() => toggleStatus(task)}>
                    <Text
                      selectable
                      style={[
                        styles.taskTitle,
                        isDone && styles.taskTitleCompleted,
                        isActive && styles.taskTitleActive,
                      ]}
                    >
                      {task.title}
                    </Text>
                  </Pressable>

                  <View style={styles.taskFooterRow}>
                    {isActive && (
                      <Text selectable style={[styles.statusLabel, { color: tokens.accent }]}>
                        In Progress
                      </Text>
                    )}
                    {isDone && (
                      <Text selectable style={[styles.statusLabel, { color: tokens.success }]}>
                        Done
                      </Text>
                    )}
                    {isBlocked && (
                      <Pressable
                        onPress={() => setExpandedBlockedId(isBlockedOpen ? null : task.id)}
                      >
                        <Text style={[styles.statusLabel, { color: tokens.warning }, unselectable]}>
                          Blocked ▾
                        </Text>
                      </Pressable>
                    )}
                    {task.duration ? (
                      <Text selectable style={styles.durationBadge}>
                        {task.duration}
                      </Text>
                    ) : null}
                  </View>

                  {isBlocked && isBlockedOpen && task.blockerReason && (
                    <View style={styles.blockedReasonBox}>
                      <Text selectable style={styles.blockedReasonText}>
                        Reason: {task.blockerReason}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </View>
      ) : null}
    </View>
  );
}
