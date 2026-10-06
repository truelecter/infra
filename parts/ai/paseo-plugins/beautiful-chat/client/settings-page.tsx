import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { PluginSurfaceProps } from "@getpaseo/plugin/client";
import { SettingsSection, SettingsSelect, SettingsSwitch } from "@getpaseo/plugin/client/ui";
import { buildThemeTokens, radius } from "./components/theme-tokens";
import { hostFontEscape } from "./components/host-font-escape";
import { updateEnhancerPreferences, useEnhancerPreferences } from "./preferences";

const TEXT_SIZES = [
  { value: "small", label: "Small", scale: 0.9 },
  { value: "default", label: "Default", scale: 1 },
  { value: "large", label: "Large", scale: 1.1 },
  { value: "larger", label: "Larger", scale: 1.25 },
] as const;

type TextSize = (typeof TEXT_SIZES)[number]["value"];

/** The option nearest a stored scale, so a value saved between steps still shows. */
function textSizeFor(scale: number): TextSize {
  let best: (typeof TEXT_SIZES)[number] = TEXT_SIZES[1];
  for (const option of TEXT_SIZES) {
    if (Math.abs(option.scale - scale) < Math.abs(best.scale - scale)) best = option;
  }
  return best.value;
}

export function BeautifulChatSettingsPage({ theme }: PluginSurfaceProps) {
  const prefs = useEnhancerPreferences();
  const tokens = useMemo(
    () => buildThemeTokens(theme.colors, prefs.fontScale),
    [theme.colors, prefs.fontScale],
  );
  const styles = useMemo(
    () =>
      StyleSheet.create({
        sample: {
          marginTop: 10,
          padding: 12,
          gap: 4,
          borderRadius: radius.card,
          borderWidth: 1,
          borderColor: tokens.borderSubtle,
          backgroundColor: tokens.surface1,
        },
        sampleTitle: {
          fontFamily: tokens.fontUi,
          fontSize: tokens.fs(13),
          lineHeight: tokens.fs(18),
          fontWeight: "600",
          color: tokens.foreground,
        },
        sampleBody: {
          fontFamily: tokens.fontUi,
          fontSize: tokens.fs(12),
          lineHeight: tokens.fs(18),
          color: tokens.foregroundMuted,
        },
        sampleCode: {
          fontFamily: tokens.fontMono,
          fontSize: tokens.fs(12),
          lineHeight: tokens.fs(18),
          color: tokens.foregroundMuted,
        },
      }),
    [tokens],
  );

  return (
    <View {...hostFontEscape}>
      <SettingsSection title="Cards">
        <SettingsSelect<TextSize>
          label="Text size"
          hint="Scales the text in this plugin's Thinking, checklist, tool activity, and question cards. Paseo's Appearance font settings cover everything else."
          value={textSizeFor(prefs.fontScale)}
          options={TEXT_SIZES}
          onValueChange={(value) => {
            const option = TEXT_SIZES.find((size) => size.value === value);
            if (option) updateEnhancerPreferences({ fontScale: option.scale });
          }}
        />
        <View style={styles.sample}>
          <Text style={styles.sampleTitle}>Thought for 4.2s</Text>
          <Text style={styles.sampleBody}>
            Read the config, then checked which callers still use the old flag.
          </Text>
          <Text style={styles.sampleCode}>$ bun run typecheck</Text>
        </View>
        <SettingsSwitch
          label="Show times"
          hint="Shows when each Thinking, checklist, tool activity, and question card arrived, at the right of its header line, worded like Paseo's own message times."
          value={prefs.showTimestamps}
          onValueChange={(value) => updateEnhancerPreferences({ showTimestamps: value })}
        />
      </SettingsSection>
      <SettingsSection title="Tool activity">
        <SettingsSwitch
          label="Combine tool calls"
          hint="Folds a turn's tool calls into one summary line that opens into the list of calls. Off draws every call as its own row. A turn with reasoning always draws rows."
          value={prefs.combineToolCalls}
          onValueChange={(value) => updateEnhancerPreferences({ combineToolCalls: value })}
        />
      </SettingsSection>
    </View>
  );
}
