import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Icon as HostIcon } from "@getpaseo/plugin/client/react-native";
import { radius, type ExtendedThemeTokens } from "./theme-tokens";
import { selectableSurface } from "./selection";
import { CardTime } from "./card-time";

interface AskCardProps {
  question: string;
  answer: string;
  tokens: ExtendedThemeTokens;
  /** When the question was asked; nothing shows when undefined. */
  time?: string;
}

/**
 * A resolved `ask`: the question, then the answer. OMP sends only the label
 * and the result text for it, so the options that were offered are not shown.
 */
export function AskCard({ question, answer, tokens, time }: AskCardProps) {
  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          marginTop: -8,
          marginBottom: 0,
          borderRadius: radius.card,
          backgroundColor: tokens.surface0,
          borderWidth: 1,
          borderColor: tokens.borderSubtle,
          overflow: "hidden",
          ...tokens.boxShadow,
          ...selectableSurface,
        },
        header: {
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 10,
          paddingHorizontal: 14,
          paddingVertical: 10,
          backgroundColor: tokens.surface1,
        },
        iconBubble: {
          width: 22,
          height: 22,
          borderRadius: radius.block,
          backgroundColor: tokens.surface2,
          alignItems: "center",
          justifyContent: "center",
        },
        question: {
          flex: 1,
          fontFamily: tokens.fontUi,
          fontSize: tokens.fs(13),
          lineHeight: tokens.fs(20),
          fontWeight: "600",
          color: tokens.foreground,
        },
        body: {
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderTopWidth: 1,
          borderTopColor: tokens.borderSubtle,
        },
        answer: {
          fontFamily: tokens.fontUi,
          fontSize: tokens.fs(13),
          lineHeight: tokens.fs(19),
          color: tokens.foregroundMuted,
        },
      }),
    [tokens],
  );

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconBubble}>
          <HostIcon name="MessageCircleQuestion" size={13} color={tokens.accent} />
        </View>
        <Text selectable style={styles.question}>
          {question || "Question"}
        </Text>
        <CardTime time={time} tokens={tokens} />
      </View>
      {answer ? (
        <View style={styles.body}>
          <Text selectable style={styles.answer}>
            {answer}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
