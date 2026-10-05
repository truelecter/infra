import type { PluginThemeContribution } from "@getpaseo/plugin";

// https://catppuccin.com/palette/ (Mocha)
export const MOCHA = {
  base: "#1e1e2e",
  text: "#cdd6f4",
  subtext0: "#a6adc8",
  overlay0: "#6c7086",
  surface1: "#45475a",
  surface0: "#313244",
  mauve: "#cba6f7",
} as const;

export const mochaTheme: PluginThemeContribution = {
  id: "mocha",
  name: "Catppuccin Mocha",
  appearance: "dark",
  colors: {
    background: MOCHA.base,
    foreground: MOCHA.text,
    raised: MOCHA.surface0,
    control: MOCHA.surface1,
    border: MOCHA.surface1,
    accent: MOCHA.mauve,
    mutedForeground: MOCHA.subtext0,
    ring: MOCHA.overlay0,
  },
};
