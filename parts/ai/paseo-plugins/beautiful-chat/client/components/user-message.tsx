import React, { useMemo, useCallback, useState } from "react";
import { View, Text, Pressable, StyleSheet, Image } from "react-native";
import { copyText } from "@getpaseo/plugin/client/react-native";
import { Glyph } from "./glyph";
import { Pop } from "./motion";
import { radius } from "./theme-tokens";
import type { ExtendedThemeTokens } from "./theme-tokens";
import { selectableSurface } from "./selection";
import { selectionSurface } from "./selection-actions";
import type { RewindMode } from "../../shared/agent-rpc";

interface UserMessageProps {
  text: string;
  timestamp?: Date;
  /** Pasted or attached images, as anything `<Image>` accepts. */
  images?: string[];
  tokens: ExtendedThemeTokens;
  /** Rewind modes this prompt offers; none hides the Rewind button. */
  rewindModes?: readonly RewindMode[];
  /** Runs the rewind; resolves to an error message, or null once it is done. */
  onRewind?: (mode: RewindMode) => Promise<string | null>;
}

// Paseo's own Rewind menu labels (`rewind.actions.*`).
const REWIND_LABEL: Record<RewindMode, string> = {
  conversation: "Rewind conversation",
  files: "Rewind files",
  both: "Rewind conversation and files",
};

type RewindState =
  | { step: "idle" }
  | { step: "confirm" }
  | { step: "running" }
  | { step: "failed"; error: string };

function formatClock(value: Date): string {
  const hh = String(value.getHours()).padStart(2, "0");
  const mm = String(value.getMinutes()).padStart(2, "0");
  const ss = String(value.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

/**
 * The user's turn. It sits to the right on light paper with dark text and no
 * accent: colour on this surface marks agent activity, so keeping it off the
 * prompt is what separates what the user wrote from what the agent did.
 * The body text stays left-aligned inside the block, because right-ragged
 * prose is harder to read once it wraps.
 */
export function UserMessage({
  text,
  timestamp,
  images,
  tokens,
  rewindModes = [],
  onRewind,
}: UserMessageProps) {
  const [rewind, setRewind] = useState<RewindState>({ step: "idle" });
  const canRewind = rewindModes.length > 0 && onRewind !== undefined;
  const runRewind = useCallback(
    (mode: RewindMode) => {
      if (!onRewind) return;
      setRewind({ step: "running" });
      // Paseo puts a rewound prompt back in the composer. A plugin cannot reach
      // the composer, so the prompt goes to the clipboard instead, before the
      // rewind removes this bubble.
      copyText(text)
        .catch(() => {})
        .then(() => onRewind(mode))
        .then((error) => setRewind(error ? { step: "failed", error } : { step: "idle" }))
        .catch((error: unknown) =>
          setRewind({ step: "failed", error: error instanceof Error ? error.message : String(error) }),
        );
    },
    [onRewind, text],
  );
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    // The host owns clipboard access. Reaching for navigator directly would
    // only work on web and would bypass its permission handling.
    copyText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      })
      .catch(() => {});
  }, [text]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          alignSelf: "flex-end",
          maxWidth: "82%",
          flexDirection: "row",
          gap: 10,
          paddingVertical: 8,
          paddingLeft: 12,
          paddingRight: 10,
          borderRadius: radius.card,
          // The square tail marks the turn's owner, matching the native stream.
          borderTopRightRadius: radius.chip,
          backgroundColor: tokens.userSurface,
          borderWidth: 1,
          borderColor: tokens.userBorder,
          ...tokens.boxShadow,
          ...selectableSurface,
        },
        body: { flex: 1, gap: 3 },
        metaRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 8,
        },
        label: {
          fontFamily: tokens.fontUi,
          fontSize: 10,
          fontWeight: "600",
          letterSpacing: 0.4,
          textTransform: "uppercase",
          color: tokens.userTextMuted,
        },
        copyButton: {
          paddingHorizontal: 4,
          paddingVertical: 2,
        },
        rewindPanel: {
          marginTop: 8,
          paddingTop: 8,
          gap: 6,
          borderTopWidth: 1,
          borderTopColor: tokens.userBorder,
        },
        rewindNote: {
          fontFamily: tokens.fontUi,
          fontSize: 12,
          lineHeight: 17,
          color: tokens.userTextMuted,
        },
        rewindError: {
          fontFamily: tokens.fontUi,
          fontSize: 12,
          lineHeight: 17,
          color: tokens.danger,
        },
        rewindActions: {
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "flex-end",
          gap: 6,
        },
        rewindAction: {
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: radius.chip,
          borderWidth: 1,
          borderColor: tokens.dangerBorder,
          backgroundColor: tokens.dangerBg,
        },
        rewindActionText: {
          fontFamily: tokens.fontUi,
          fontSize: 12,
          fontWeight: "600",
          color: tokens.danger,
        },
        rewindCancel: {
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: radius.chip,
          borderWidth: 1,
          borderColor: tokens.userBorder,
        },
        rewindCancelText: {
          fontFamily: tokens.fontUi,
          fontSize: 12,
          color: tokens.userText,
        },
        clock: {
          fontFamily: tokens.fontUi,
          fontSize: 10,
          color: tokens.userTextMuted,
        },
        text: {
          fontFamily: tokens.fontUi,
          fontSize: 13.5,
          lineHeight: 20,
          color: tokens.userText,
        },
        imageRow: {
          marginTop: 8,
          gap: 6,
        },
        image: {
          width: "100%",
          // Tall enough to read, bounded so a screenshot cannot take over
          // the thread.
          height: 200,
          borderRadius: radius.block,
          backgroundColor: tokens.userBorder,
        },
      }),
    [tokens],
  );

  return (
    <View {...selectionSurface} style={styles.container}>
      <View style={styles.body}>
        <View style={styles.metaRow}>
          <Text selectable style={styles.label}>
            You
          </Text>
          {timestamp ? (
            <Text selectable style={styles.clock}>
              {formatClock(timestamp)}
            </Text>
          ) : null}
          <Pressable
            onPress={handleCopy}
            accessibilityRole="button"
            accessibilityLabel="Copy prompt"
            style={styles.copyButton}
          >
            <Pop trigger={copied}>
              <Glyph
                name={copied ? "Check" : "Copy"}
                size={11}
                color={copied ? tokens.userText : tokens.userTextMuted}
              />
            </Pop>
          </Pressable>
          {canRewind ? (
            <Pressable
              onPress={() => setRewind(rewind.step === "confirm" ? { step: "idle" } : { step: "confirm" })}
              disabled={rewind.step === "running"}
              accessibilityRole="button"
              accessibilityLabel="Rewind to this prompt"
              style={styles.copyButton}
            >
              <Glyph name="Rewind" size={11} color={tokens.userTextMuted} />
            </Pressable>
          ) : null}
        </View>
        <Text selectable style={styles.text}>
          {text}
        </Text>
        {images?.length ? (
          <View style={styles.imageRow}>
            {images.map((uri) => (
              <Image
                key={uri}
                source={{ uri }}
                style={styles.image}
                resizeMode="contain"
                accessibilityLabel="Attached image"
              />
            ))}
          </View>
        ) : null}
        {canRewind && rewind.step !== "idle" ? (
          <View style={styles.rewindPanel}>
            <Text style={rewind.step === "failed" ? styles.rewindError : styles.rewindNote}>
              {rewind.step === "failed"
                ? `Rewind failed: ${rewind.error}`
                : rewind.step === "running"
                  ? "Rewinding..."
                  : "Rewind to this prompt? It and every turn after it are removed. The prompt is copied to the clipboard so you can send it again."}
            </Text>
            {rewind.step === "running" ? null : (
              <View style={styles.rewindActions}>
                <Pressable onPress={() => setRewind({ step: "idle" })} accessibilityRole="button" style={styles.rewindCancel}>
                  <Text style={styles.rewindCancelText}>{rewind.step === "failed" ? "Close" : "Cancel"}</Text>
                </Pressable>
                {rewind.step === "confirm"
                  ? rewindModes.map((mode) => (
                      <Pressable
                        key={mode}
                        onPress={() => runRewind(mode)}
                        accessibilityRole="button"
                        style={styles.rewindAction}
                      >
                        <Text style={styles.rewindActionText}>{REWIND_LABEL[mode]}</Text>
                      </Pressable>
                    ))
                  : null}
              </View>
            )}
          </View>
        ) : null}
      </View>
    </View>
  );
}
