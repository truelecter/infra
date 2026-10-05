import React, { useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Glyph } from "./glyph";
import { radius } from "./theme-tokens";
import type { ExtendedThemeTokens } from "./theme-tokens";
import { SyntaxHighlightBlock, renderTerminalOutput } from "./syntax-highlight";
import { unselectable } from "./selection";
import { selectionCodeText } from "./selection-actions";
import { openLink } from "./open-link";
import type { GitHubToolData } from "../../shared/contracts";

interface GitHubBodyProps {
  data: GitHubToolData | undefined;
  tokens: ExtendedThemeTokens;
  running: boolean;
}

/**
 * The answer to a `github` device call.
 *
 * The header of the card already names the op, the repo and the subject, so
 * this draws only what came back: a file on the code surface, typed rows for
 * an op that reports facts, or the reply as terminal text when the op has no
 * shape this plugin knows. The request stays behind a disclosure — it is worth
 * auditing occasionally, and the host offers no other view of it, but it
 * repeats what the header just said.
 */
export function GitHubBody({ data, tokens, running }: GitHubBodyProps) {
  const [showRequest, setShowRequest] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { gap: 8 },
        row: {
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          paddingVertical: 3,
        },
        label: {
          fontFamily: tokens.fontMono,
          fontSize: 11.5,
          color: tokens.foreground,
          flexShrink: 1,
          minWidth: 0,
        },
        value: { fontFamily: tokens.fontUi, fontSize: 11, color: tokens.foregroundMuted },
        okValue: {
          fontFamily: tokens.fontUi,
          fontSize: 10,
          color: tokens.success,
          backgroundColor: tokens.successBg,
          paddingHorizontal: 6,
          paddingVertical: 1,
          borderRadius: radius.chip,
        },
        badValue: {
          fontFamily: tokens.fontUi,
          fontSize: 10,
          color: tokens.danger,
          backgroundColor: tokens.dangerBg,
          paddingHorizontal: 6,
          paddingVertical: 1,
          borderRadius: radius.chip,
        },
        spacer: { flex: 1, minWidth: 8 },
        link: {
          fontFamily: tokens.fontMono,
          fontSize: 11,
          color: tokens.accent,
          textDecorationLine: "underline",
        },
        terminal: {
          padding: 10,
          borderRadius: radius.block,
          backgroundColor: tokens.surfaceCode,
          borderWidth: 1,
          borderColor: tokens.borderSubtle,
        },
        terminalText: {
          fontFamily: tokens.fontMono,
          fontSize: 11.5,
          lineHeight: 17,
          color: tokens.foregroundMuted,
        },
        note: { fontFamily: tokens.fontUi, fontSize: 11, color: tokens.foregroundSubtle },
        toggle: {
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          alignSelf: "flex-start",
          paddingHorizontal: 6,
          paddingVertical: 3,
          borderRadius: radius.block,
          backgroundColor: tokens.surface2,
        },
        toggleLabel: {
          fontFamily: tokens.fontUi,
          fontSize: 10,
          color: tokens.foregroundMuted,
          ...unselectable,
        },
      }),
    [tokens],
  );

  if (!data) {
    return (
      <Text selectable style={styles.note}>
        {running ? "Waiting for GitHub…" : "The call returned no detail."}
      </Text>
    );
  }

  return (
    <View style={styles.container}>
      {data.file ? (
        <SyntaxHighlightBlock
          code={data.file.code}
          language={data.file.language ?? "text"}
          filename={data.file.name}
          tokens={tokens}
          showLineNumbers
          compact
        />
      ) : null}

      {data.rows?.map((row) => (
        <View key={`${row.label}:${row.value}`} style={styles.row}>
          <Text selectable style={styles.label} numberOfLines={1}>
            {row.label}
          </Text>
          <View style={styles.spacer} />
          <Text
            selectable
            style={
              row.tone === "ok"
                ? styles.okValue
                : row.tone === "bad"
                  ? styles.badValue
                  : styles.value
            }
          >
            {row.value}
          </Text>
        </View>
      ))}

      {data.text ? (
        <View style={styles.terminal}>
          <Text selectable {...selectionCodeText} style={styles.terminalText}>
            {renderTerminalOutput(data.text, tokens)}
          </Text>
        </View>
      ) : null}

      {data.link ? (
        <Pressable accessibilityRole="link" onPress={() => openLink(data.link ?? "")}>
          <Text style={styles.link} numberOfLines={1}>
            {data.link}
          </Text>
        </Pressable>
      ) : null}

      {!data.file && !data.rows && !data.text ? (
        <Text selectable style={styles.note}>
          {running ? "Waiting for GitHub…" : "The op returned no output."}
        </Text>
      ) : null}

      {data.request ? (
        <View style={{ gap: 6 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={showRequest ? "Hide the request" : "Show the request"}
            onPress={() => setShowRequest((previous) => !previous)}
            style={styles.toggle}
          >
            <Glyph
              name={showRequest ? "ChevronUp" : "ChevronDown"}
              size={11}
              color={tokens.foregroundMuted}
            />
            <Text style={styles.toggleLabel}>request</Text>
          </Pressable>
          {showRequest ? (
            <SyntaxHighlightBlock code={data.request} language="json" tokens={tokens} compact />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
