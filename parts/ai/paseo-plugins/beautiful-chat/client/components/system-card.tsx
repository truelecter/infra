import React, { useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Glyph } from "./glyph";
import { frosted } from "./frosted";
import { surfaceProps } from "./view-props";
import { glowing } from "./glow";
import { Rotate } from "./motion";
import { radius } from "./theme-tokens";
import type { ExtendedThemeTokens } from "./theme-tokens";
import { SyntaxHighlightBlock } from "./syntax-highlight";
import { selectableSurface, unselectable } from "./selection";
import { selectionSurface } from "./selection-actions";
import type { SystemEnvelope, SystemEnvelopeKind } from "../system-envelope";

interface SystemCardProps {
  envelope: SystemEnvelope;
  tokens: ExtendedThemeTokens;
}

const KIND_LOOK: Record<SystemEnvelopeKind, { glyph: string; label: string }> = {
  job: { glyph: "ListChecks", label: "Job" },
  message: { glyph: "Bot", label: "Agent" },
  reminder: { glyph: "AlertCircle", label: "Reminder" },
  process: { glyph: "Terminal", label: "Process" },
  notice: { glyph: "CircleDot", label: "Notice" },
};

/** Body longer than this opens closed: a job preview is pages of JSON. */
const COLLAPSE_LIMIT = 220;

/**
 * The surface follows the envelope, not a guess about the text. A job carries
 * a tool's output and earns the code surface; a relayed message or a reminder
 * is written for a reader. JSON is JSON wherever it appears.
 */
function bodyKind(envelope: SystemEnvelope): "json" | "output" | "prose" {
  const head = envelope.body.trimStart()[0];
  if (head === "{" || head === "[") return "json";
  return envelope.kind === "job" ? "output" : "prose";
}

/**
 * Harness text — a finished background job, an agent's relayed message, a
 * reminder — drawn as a card rather than as the model's own words.
 *
 * The host files these under the same item kind as a reply, so without this
 * the raw `<system-notice>` markup reads as something the model typed.
 */
export function SystemCard({ envelope, tokens }: SystemCardProps): React.ReactElement {
  const look = KIND_LOOK[envelope.kind];
  const [expanded, setExpanded] = useState(envelope.body.length <= COLLAPSE_LIMIT);
  const accent = envelope.failed ? tokens.danger : tokens.foregroundSubtle;
  const kind = bodyKind(envelope);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          borderRadius: radius.card,
          borderWidth: 1,
          borderColor: envelope.failed ? tokens.dangerBorder : tokens.borderSubtle,
          backgroundColor: tokens.surfaceGlass,
          overflow: "hidden",
          ...tokens.boxShadow,
          ...selectableSurface,
        },
        header: {
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          paddingHorizontal: 10,
          paddingVertical: 7,
          backgroundColor: envelope.failed ? tokens.dangerBg : tokens.surface1,
        },
        badge: {
          fontFamily: tokens.fontUi,
          fontSize: 10,
          fontWeight: "700",
          textTransform: "uppercase",
          letterSpacing: 0.5,
          color: accent,
          ...unselectable,
        },
        title: {
          fontFamily: tokens.fontUi,
          fontSize: 12,
          fontWeight: "600",
          color: tokens.foreground,
          flexShrink: 1,
          minWidth: 0,
        },
        chips: {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          flexShrink: 0,
        },
        chip: {
          fontFamily: tokens.fontUi,
          fontSize: 10,
          color: tokens.foregroundSubtle,
          backgroundColor: tokens.surface2,
          paddingHorizontal: 6,
          paddingVertical: 1,
          borderRadius: radius.chip,
          ...unselectable,
        },
        spacer: { flex: 1, minWidth: 8 },
        body: { padding: 10 },
        prose: {
          fontFamily: tokens.fontUi,
          fontSize: 12,
          lineHeight: 18,
          color: tokens.foreground,
        },
      }),
    [tokens, envelope.failed, accent],
  );

  const chips = envelope.chips.map((chip) => (
    <Text key={chip.label} style={styles.chip}>
      {chip.value}
    </Text>
  ));

  const head = (
    <View style={styles.header}>
      <Glyph name={look.glyph} size={13} color={accent} />
      <Text style={styles.badge}>{look.label}</Text>
      <Text style={styles.title} numberOfLines={2}>
        {envelope.title}
      </Text>
      <View style={styles.spacer} />
      <View style={styles.chips}>{chips}</View>
      {envelope.body ? (
        <Rotate active={expanded}>
          <Glyph name="ChevronDown" size={13} color={tokens.foregroundMuted} />
        </Rotate>
      ) : null}
    </View>
  );

  return (
    <View
      {...surfaceProps(frosted, glowing(tokens.isDark), selectionSurface)}
      style={styles.container}
    >
      {envelope.body ? (
        <Pressable accessibilityRole="button" onPress={() => setExpanded((prev) => !prev)}>
          {head}
        </Pressable>
      ) : (
        head
      )}
      {envelope.body && expanded ? (
        <View style={styles.body}>
          {kind === "prose" ? (
            <Text selectable style={styles.prose}>
              {envelope.body}
            </Text>
          ) : (
            <SyntaxHighlightBlock
              code={envelope.body}
              language={kind === "json" ? "json" : "text"}
              tokens={tokens}
              compact
            />
          )}
        </View>
      ) : null}
    </View>
  );
}
