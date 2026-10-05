import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Glyph } from "./glyph";
import { frosted } from "./frosted";
import { surfaceProps } from "./view-props";
import { glowing } from "./glow";
import { radius } from "./theme-tokens";
import type { ExtendedThemeTokens } from "./theme-tokens";
import { renderTerminalOutput } from "./syntax-highlight";
import { selectableSurface, unselectable } from "./selection";
import { selectionCodeText, selectionSurface } from "./selection-actions";
import type { NoticeCalloutData } from "../../shared/contracts";

interface NoticeCalloutProps {
  data: NoticeCalloutData;
  tokens: ExtendedThemeTokens;
}

/** One level, resolved to the mark and the tokens that carry it. */
interface LevelLook {
  label: string;
  glyph: string;
  accent: string;
  tint: string;
  border: string;
}

function levelLook(data: NoticeCalloutData, tokens: ExtendedThemeTokens): LevelLook {
  // A host `error` item is a failure whatever level it claims, so it takes the
  // danger tokens before the level is read.
  if (data.fatal || data.level === "error") {
    return {
      label: "Error",
      glyph: "AlertCircle",
      accent: tokens.danger,
      tint: tokens.dangerBg,
      border: tokens.dangerBorder,
    };
  }
  if (data.level === "warning") {
    return {
      label: "Warning",
      glyph: "AlertTriangle",
      accent: tokens.warning,
      tint: tokens.warningBg,
      border: tokens.warningBorder,
    };
  }
  return {
    label: "Info",
    glyph: "CircleDot",
    accent: tokens.accent,
    tint: tokens.accentBg,
    // There is no `accentBorder` token, and an accent hairline is how the
    // plugin marks a running tool. An informational notice is not work in
    // progress, so it keeps the neutral border.
    border: tokens.borderSubtle,
  };
}

/** Past this, a message stops fitting on the badge row and moves to its own block. */
const INLINE_LIMIT = 120;

/**
 * Marks a notice as machine text rather than a sentence: a URI scheme (`xd://`
 * included), an MCP tool id, a path run, or a comma-separated list of dotted
 * or underscored identifiers. Those read as data, so they go to the monospace
 * body where a mount notice listing thirty tool ids wraps instead of running
 * off the card.
 */
const TECHNICAL =
  /:\/\/|mcp__|[\w.-]+[\\/][\w.-]+[\\/]|[\w.$-]*[._][\w.$-]*\s*,\s*[\w.$-]*[._][\w.$-]*/;

/**
 * A host `notification` or `error` item, drawn as a callout instead of the
 * plain block the host ships. There is no disclosure control: the item carries
 * one message and nothing else, so hiding it behind a chevron only adds a click.
 */
export function NoticeCallout({ data, tokens }: NoticeCalloutProps): React.ReactElement {
  const look = levelLook(data, tokens);
  const message = data.message.trim();
  const asData = message.includes("\n") || message.length > INLINE_LIMIT || TECHNICAL.test(message);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          marginVertical: 4,
          borderRadius: radius.card,
          backgroundColor: tokens.surfaceGlass,
          borderWidth: 1,
          borderColor: look.border,
          ...tokens.boxShadow,
          overflow: "hidden",
          padding: 10,
          gap: 6,
          ...selectableSurface,
        },
        row: {
          flexDirection: "row",
          // Top alignment, because a wrapped message grows downwards and a
          // centred badge would drift to the middle of it.
          alignItems: "flex-start",
          gap: 8,
        },
        badge: {
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: radius.chip,
          backgroundColor: look.tint,
        },
        badgeLabel: {
          fontFamily: tokens.fontUi,
          fontSize: 10,
          fontWeight: "700",
          textTransform: "uppercase",
          letterSpacing: 0.5,
          color: look.accent,
          ...unselectable,
        },
        // `flex: 1` with `minWidth: 0` is what makes the message wrap beside
        // the badge. A flex child floors at its content width by default, so
        // without the override a long line widens the row instead of folding.
        message: {
          flex: 1,
          minWidth: 0,
          fontFamily: tokens.fontUi,
          fontSize: 12,
          lineHeight: 18,
          color: tokens.foreground,
        },
        dataBlock: {
          padding: 8,
          borderRadius: radius.block,
          backgroundColor: tokens.surfaceCode,
          borderLeftWidth: 2,
          borderLeftColor: look.accent,
        },
        dataText: {
          fontFamily: tokens.fontMono,
          fontSize: 11.5,
          lineHeight: 17,
          color: tokens.foregroundMuted,
        },
      }),
    [tokens, look.accent, look.tint, look.border],
  );

  return (
    <View
      {...surfaceProps(frosted, glowing(tokens.isDark), selectionSurface)}
      style={styles.container}
    >
      <View style={styles.row}>
        <View style={styles.badge}>
          <Glyph name={look.glyph} size={11} color={look.accent} />
          <Text style={styles.badgeLabel}>{look.label}</Text>
        </View>

        {asData ? null : (
          <Text selectable style={styles.message}>
            {message}
          </Text>
        )}
      </View>

      {asData ? (
        <View style={styles.dataBlock}>
          <Text selectable {...selectionCodeText} style={styles.dataText}>
            {renderTerminalOutput(message, tokens)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
