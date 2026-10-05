import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { View, Text, Pressable, StyleSheet, Animated } from "react-native";
import { Glyph } from "./glyph";
import { frosted } from "./frosted";
import { surfaceProps } from "./view-props";
import { glowing } from "./glow";
import { Glow, Rotate } from "./motion";
import { PulseDot } from "./pulse-dot";
import { Breathe } from "./breathe";
import { radius } from "./theme-tokens";
import { selectableSurface } from "./selection";
import { selectionSurface } from "./selection-actions";
import type { ExtendedThemeTokens } from "./theme-tokens";
import type { ReasoningTraceData, ReasoningStep } from "../../shared/contracts";
import { SyntaxHighlightBlock } from "./syntax-highlight";

interface ReasoningTraceProps {
  data: ReasoningTraceData;
  tokens: ExtendedThemeTokens;
  defaultExpanded?: boolean;
}

export function ReasoningTrace({ data, tokens, defaultExpanded = false }: ReasoningTraceProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Same as the tool callout: the trace mounts while the model is still
  // streaming, so the collapse that follows arrives as a prop change.
  const previousDefaultExpanded = useRef(defaultExpanded);
  if (previousDefaultExpanded.current !== defaultExpanded) {
    previousDefaultExpanded.current = defaultExpanded;
    setIsExpanded(defaultExpanded);
  }
  const [activeStepId, setActiveStepId] = useState<string | null>(null);

  const durationFormatted = (data.durationMs / 1000).toFixed(1);
  const isThinking = data.status === "thinking";

  // The rail is drawn to measured tick positions rather than a percentage of
  // the container: step rows have different heights, so a fraction of the
  // total would stop between ticks instead of on one.
  const [tickCentres, setTickCentres] = useState<number[]>([]);
  const recordTick = useCallback((index: number, y: number) => {
    setTickCentres((current) => {
      // The dot is 14px tall at top: 4, so its centre sits 11px into the row.
      const centre = y + 11;
      if (current[index] === centre) return current;
      const next = current.slice();
      next[index] = centre;
      return next;
    });
  }, []);

  // The rail reaches the newest step that has started, so it advances one tick
  // at a time as the stream produces them.
  const reachedIndex = useMemo(() => {
    let last = -1;
    data.steps.forEach((step, index) => {
      if (step.status === "completed" || step.status === "active") last = index;
    });
    return last;
  }, [data.steps]);

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
        wrapper: {
          marginVertical: 8,
          borderRadius: radius.card,
          backgroundColor: tokens.surfaceGlass,
          borderWidth: 1,
          borderColor: isThinking ? tokens.borderSubtle : tokens.borderSubtle,
          overflow: "hidden",
          ...tokens.boxShadow,
          ...selectableSurface,
        },
        header: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 14,
          paddingVertical: 10,
          backgroundColor: isThinking ? tokens.accentBg : tokens.surface1,
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
        },
        titleRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        },
        titleText: {
          fontFamily: tokens.fontUi,
          fontSize: 13,
          fontWeight: "600",
          color: tokens.foreground,
        },
        badgeRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          marginTop: 2,
        },
        badge: {
          fontSize: 11,
          fontFamily: tokens.fontUi,
          paddingHorizontal: 5,
          paddingVertical: 1,
          borderRadius: radius.chip,
          backgroundColor: tokens.surface2,
          color: tokens.foregroundMuted,
        },
        modelBadge: {
          fontSize: 11,
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
        body: {
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 16,
          borderTopWidth: 1,
          borderTopColor: tokens.borderSubtle,
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
        stepItem: {
          marginBottom: 16,
          position: "relative",
        },
        stepDot: {
          position: "absolute",
          left: -20,
          top: 4,
          width: 14,
          height: 14,
          alignItems: "center",
          justifyContent: "center",
        },
        stepHeader: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingVertical: 2,
        },
        stepTitleRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          flex: 1,
        },
        stepTitle: {
          fontFamily: tokens.fontUi,
          fontSize: 13,
          fontWeight: "600",
          color: tokens.foreground,
        },
        stepDuration: {
          fontSize: 11,
          color: tokens.foregroundSubtle,
          fontFamily: tokens.fontUi,
        },
        stepContent: {
          fontFamily: tokens.fontUi,
          marginTop: 6,
          fontSize: 12,
          lineHeight: 18,
          color: tokens.foregroundMuted,
        },
        footer: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "flex-end",
          paddingTop: 8,
          marginTop: 8,
          borderTopWidth: 1,
          borderTopColor: tokens.borderSubtle,
        },
        footerText: {
          fontFamily: tokens.fontUi,
          fontSize: 11,
          color: tokens.foregroundSubtle,
        },
      }),
    [tokens, isThinking],
  );

  return (
    <View
      {...surfaceProps(frosted, glowing(tokens.isDark), selectionSurface)}
      style={styles.wrapper}
    >
      <Pressable onPress={() => setIsExpanded((prev) => !prev)} style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconBubble}>
            <Breathe active={isThinking}>
              <Glyph
                name="Brain"
                size={13}
                color={isThinking ? tokens.accent : tokens.foregroundMuted}
              />
            </Breathe>
          </View>
          <View style={styles.titleContainer}>
            <View style={styles.titleRow}>
              <Text selectable style={styles.titleText}>
                {isThinking
                  ? "Thinking in progress…"
                  : data.durationMs > 0
                    ? `Thought for ${durationFormatted}s`
                    : "Reasoning summary"}
              </Text>
            </View>
            <View style={styles.badgeRow}>
              {data.agentModel && data.agentModel !== "Reasoning Trace" ? (
                <Text selectable style={styles.modelBadge}>
                  {data.agentModel}
                </Text>
              ) : null}
              {data.steps.length > 0 ? (
                <Text selectable style={styles.badge}>
                  {data.steps.length} steps
                </Text>
              ) : null}
              {data.totalTokens > 0 ? (
                <Text selectable style={styles.badge}>
                  {data.totalTokens.toLocaleString()} tokens
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.headerRight}>
          {/* A badge is for an active or failed state. A finished trace already
              says so through its duration and token count, so a green
              "Completed" pill only adds colour. */}
          {isThinking ? (
            <View style={styles.statusRow}>
              <PulseDot color={tokens.accent} size={6} />
              <Text selectable style={styles.statusText}>
                Reasoning
              </Text>
            </View>
          ) : null}
          <Rotate active={isExpanded}>
            <Glyph name="ChevronDown" size={16} color={tokens.foregroundMuted} />
          </Rotate>
        </View>
      </Pressable>

      {isExpanded && (
        <View style={styles.body}>
          <View style={styles.timelineContainer}>
            <Animated.View style={[styles.timelineRail, { height: railHeight }]} />

            {data.steps.map((step, stepIndex) => {
              const isStepActive = step.status === "active";
              const isStepDone = step.status === "completed";
              const isDetailOpen = activeStepId === step.id || isStepActive;

              return (
                <View
                  key={step.id}
                  style={styles.stepItem}
                  onLayout={(event) => recordTick(stepIndex, event.nativeEvent.layout.y)}
                >
                  <View style={styles.stepDot}>
                    {/* Done gets the filled disc and tick. A step that has not
                        finished is an empty gray circle, and the rail growing up
                        to it already says which one is current. */}
                    {isStepDone ? (
                      <Glyph name="CheckCircle" size={13} color={tokens.success} />
                    ) : (
                      <Glow active={isStepActive} color={tokens.accent} size={22}>
                        <Glyph
                          name="Circle"
                          size={13}
                          color={isStepActive ? tokens.accent : tokens.foregroundSubtle}
                        />
                      </Glow>
                    )}
                  </View>

                  <Pressable
                    onPress={() => setActiveStepId(activeStepId === step.id ? null : step.id)}
                    style={styles.stepHeader}
                  >
                    <View style={styles.stepTitleRow}>
                      <Text selectable style={styles.stepTitle}>
                        {step.title ? `${step.number}. ${step.title}` : `Step ${step.number}`}
                      </Text>
                    </View>
                    {step.durationMs ? (
                      <Text selectable style={styles.stepDuration}>
                        {(step.durationMs / 1000).toFixed(1)}s
                      </Text>
                    ) : null}
                  </Pressable>

                  <Text selectable style={styles.stepContent}>
                    {step.content}
                  </Text>

                  {step.codeSnippet && isDetailOpen && (
                    <SyntaxHighlightBlock
                      code={step.codeSnippet.code}
                      language={step.codeSnippet.language}
                      filename={step.codeSnippet.filename}
                      tokens={tokens}
                      compact
                    />
                  )}
                </View>
              );
            })}
          </View>

          <View style={styles.footer}>
            <Text selectable style={styles.footerText}>
              Total Tokens: {data.totalTokens}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}
