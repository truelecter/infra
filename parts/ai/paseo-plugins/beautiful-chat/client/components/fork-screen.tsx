import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRpc, type PluginSurfaceProps } from "@getpaseo/plugin/client";
import { forkRpc } from "../../shared/agent-rpc";
import { type ForkTarget, takeForkTarget } from "../agent-actions";

type Step = { step: "edit" } | { step: "starting" } | { step: "failed"; error: string };

/**
 * Paseo's Fork opens a draft with the chat history attached, where the first
 * message is written. A plugin can't open a draft, so this screen stands in for
 * it: it takes the first message, starts the agent through the daemon, and
 * opens it.
 */
export function ForkScreen({ theme, layout, navigation }: PluginSurfaceProps) {
  // Read once: the target belongs to the Fork press that opened this screen.
  const [target] = useState<ForkTarget | null>(takeForkTarget);
  const sourceTitle = target?.sourceTitle ?? null;
  const fork = useRpc(forkRpc);
  const [prompt, setPrompt] = useState("");
  const [state, setState] = useState<Step>({ step: "edit" });

  const styles = useMemo(
    () =>
      StyleSheet.create({
        screen: { flex: 1, backgroundColor: theme.colors.surface0 },
        content: {
          padding: layout.compact ? 16 : 24,
          gap: 12,
          maxWidth: 720,
          width: "100%",
          alignSelf: "center",
        },
        title: { color: theme.colors.foreground, fontSize: layout.compact ? 18 : 20, fontWeight: "600" },
        note: { color: theme.colors.foregroundMuted, fontSize: 13, lineHeight: 19 },
        error: { color: theme.colors.statusDanger, fontSize: 13, lineHeight: 19 },
        input: {
          minHeight: 120,
          padding: 12,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.surface1,
          color: theme.colors.foreground,
          fontSize: 14,
          lineHeight: 20,
          textAlignVertical: "top",
        },
        actions: { flexDirection: "row", justifyContent: "flex-end", gap: 8 },
        secondary: {
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: theme.colors.border,
        },
        secondaryText: { color: theme.colors.foreground, fontSize: 13 },
        primary: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: theme.colors.accent },
        primaryDisabled: { opacity: 0.5 },
        primaryText: { color: theme.colors.accentForeground, fontSize: 13, fontWeight: "600" },
      }),
    [theme, layout.compact],
  );

  if (!target) {
    return (
      <View style={styles.screen}>
        <View style={styles.content}>
          <Text style={styles.title}>Fork conversation</Text>
          <Text style={styles.note}>Nothing to fork. Use Fork under an agent's latest reply.</Text>
        </View>
      </View>
    );
  }

  const trimmed = prompt.trim();
  const starting = state.step === "starting";
  const start = () => {
    if (!trimmed || starting) return;
    setState({ step: "starting" });
    fork({ agentId: target.agentId, boundaryMessageId: target.boundaryMessageId, prompt: trimmed })
      .then(({ agentId, error }) => {
        if (!agentId) {
          setState({ step: "failed", error: error ?? "The agent was not created." });
          return;
        }
        if (navigation) navigation.openAgent({ agentId });
        else setState({ step: "failed", error: "Forked. Open the new agent from the sidebar." });
      })
      .catch((error: unknown) =>
        setState({ step: "failed", error: error instanceof Error ? error.message : String(error) }),
      );
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Fork conversation</Text>
      <Text style={styles.note}>
        A new agent in the same workspace starts with the chat history of {sourceTitle ? `"${sourceTitle}"` : "this agent"}{" "}
        up to the reply you picked, with the same provider, model, and mode. Write its first message.
      </Text>
      <TextInput
        accessibilityLabel="First message"
        multiline
        autoFocus
        editable={!starting}
        value={prompt}
        onChangeText={setPrompt}
        placeholder="What should the new agent do?"
        placeholderTextColor={theme.colors.foregroundMuted}
        style={styles.input}
      />
      {state.step === "failed" ? <Text style={styles.error}>{state.error}</Text> : null}
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation?.openAgent({ agentId: target.agentId })}
          disabled={starting || !navigation}
          style={styles.secondary}
        >
          <Text style={styles.secondaryText}>Back</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={start}
          disabled={!trimmed || starting}
          style={[styles.primary, !trimmed || starting ? styles.primaryDisabled : null]}
        >
          <Text style={styles.primaryText}>{starting ? "Starting..." : "Start agent"}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
