import React, { useMemo } from "react";
import { StyleSheet, Text } from "react-native";
import type { ExtendedThemeTokens } from "./theme-tokens";

/** The time on a card's header line; nothing when the setting hides times. */
export function CardTime({ time, tokens }: { time: string | undefined; tokens: ExtendedThemeTokens }) {
  const styles = useMemo(
    () =>
      StyleSheet.create({
        time: {
          flexShrink: 0,
          fontFamily: tokens.fontUi,
          fontSize: tokens.fs(11),
          color: tokens.foregroundSubtle,
          fontVariant: ["tabular-nums"],
        },
      }),
    [tokens],
  );
  if (!time) return null;
  return (
    <Text selectable numberOfLines={1} style={styles.time}>
      {time}
    </Text>
  );
}
