import type { ComponentType } from "react";
import { useCallback, useEffect, useMemo } from "react";
import { Text } from "react-native";
import { useSettings, type PluginSurfaceProps } from "@getpaseo/plugin/client";
import { SettingsAction, SettingsCard, SettingsSection, SettingsSelect } from "@getpaseo/plugin/client/ui";
import { chatWidth, type ChatWidth } from "../shared/settings.ts";

const PERCENT_CHOICES = [70, 75, 80, 85, 90, 95, 100];
const MAX_PX_CHOICES = [0, 1000, 1200, 1400, 1600, 1920, 2560];

function options(choices: number[], current: number, label: (value: number) => string) {
  const values = choices.includes(current) ? choices : [...choices, current].sort((a, b) => a - b);
  return values.map((value) => ({ label: label(value), value: String(value) }));
}

const percentLabel = (value: number) => `${value}% of the pane`;
const maxPxLabel = (value: number) => (value === 0 ? "No limit" : `${value}px`);

export function createWidthSettingsScreen(
  onValues: (width: ChatWidth) => void,
): ComponentType<PluginSurfaceProps> {
  return function WidthSettings({ theme, layout }: PluginSurfaceProps) {
    const settings = useSettings(chatWidth);
    const values = settings.status === "ready" ? settings.values : null;
    const textStyle = useMemo(() => ({ color: theme.colors.foregroundMuted }), [theme]);

    // Apply straight away in this window; other windows pick it up on focus.
    useEffect(() => {
      if (values) onValues(values);
    }, [values?.percent, values?.maxPx]);

    const save = useCallback(
      (patch: Partial<ChatWidth>) => {
        if (settings.status !== "ready") return;
        void settings.save({ ...settings.values, ...patch }, settings.revision);
      },
      [settings],
    );

    if (settings.status === "loading") return <Text style={textStyle}>Loading settings…</Text>;
    if (settings.status !== "ready") {
      return (
        <SettingsSection title="Chat width">
          <Text style={textStyle}>{settings.error}</Text>
          <SettingsAction label="Try again" actionLabel="Reload" onPress={settings.reload} />
          {settings.status === "invalid" ? (
            <SettingsAction
              label="Restore default settings"
              actionLabel="Reset"
              onPress={settings.reset}
            />
          ) : null}
        </SettingsSection>
      );
    }

    return (
      <SettingsSection title="Chat width">
        <SettingsCard>
          <SettingsSelect
            label="Width"
            hint="Share of the agent pane for messages and the composer. Never narrower than Paseo's default 820px."
            value={String(settings.values.percent)}
            options={options(PERCENT_CHOICES, settings.values.percent, percentLabel)}
            disabled={settings.saving}
            error={settings.saveError}
            onValueChange={(value) => save({ percent: Number(value) })}
          />
          <SettingsSelect
            label="Maximum width"
            hint="Upper bound for very wide windows."
            value={String(settings.values.maxPx)}
            options={options(MAX_PX_CHOICES, settings.values.maxPx, maxPxLabel)}
            disabled={settings.saving}
            onValueChange={(value) => save({ maxPx: Number(value) })}
          />
        </SettingsCard>
        {layout.platform === "web" ? null : (
          <Text style={textStyle}>Applies in the desktop app and browser only.</Text>
        )}
      </SettingsSection>
    );
  };
}
