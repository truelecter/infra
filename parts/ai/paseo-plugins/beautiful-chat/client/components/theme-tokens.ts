import type { PluginTheme } from "@getpaseo/plugin";
import { DEFAULT_PREFERENCES, type EnhancerPreferences, ACCENT_PRESETS } from "../preferences";

export type PluginSurfaceColors = PluginTheme["colors"];

/**
 * Corner rounding, in three tiers: outer card, inner block, small chip. Each
 * tier steps down so a block nested in a card reads as inside it rather than
 * as a second card. Components reference these rather than literals, so the
 * tier a surface belongs to is stated once and stays consistent.
 */
export const radius = { card: 12, block: 8, chip: 5 } as const;

/**
 * One family name per stack, never a comma-separated CSS list. React Native's
 * `fontFamily` takes a single family; a list is not parsed and the whole
 * declaration is dropped, which silently leaves every surface on the host
 * default. Fallbacks live in the `@font-face` `src` chain instead, so these
 * names always resolve to something.
 */
export const fontMono = "OMP Iosevka";

/**
 * The ligature cut of Iosevka, used only inside code blocks. Terminal output,
 * diffs and paths stay on `fontMono`: a shaped `->` or `=>` stops matching the
 * bytes it stands for, which is wrong for a log line or a patch.
 */
export const fontCode = "OMP Iosevka Code";
export const fontUi = "OMP Inter";

export interface ExtendedThemeTokens {
  isDark: boolean;
  fontMono: string;
  fontCode: string;
  fontUi: string;

  // Surfaces
  surface0: string;
  surface1: string;
  surface2: string;
  surfaceCode: string;
  // Translucent variants, for surfaces that blur what sits behind them.
  surfaceGlass: string;
  surfaceCodeGlass: string;

  // Foreground
  foreground: string;
  foregroundMuted: string;
  foregroundSubtle: string;

  // Accent: primary action, selection, and running state only
  accent: string;
  accentForeground: string;
  accentBg: string;
  // The authored turn sits on a raised theme surface, exactly as the native
  // stream draws it. It carries no accent: colour belongs to the agent's work.
  userSurface: string;
  userBorder: string;
  userText: string;
  userTextMuted: string;

  // Semantic status: failure, risk, and diff markers only
  success: string;
  successBg: string;
  successBorder: string;

  warning: string;
  warningBg: string;
  warningBorder: string;

  danger: string;
  dangerBg: string;
  dangerBorder: string;

  // Borders
  border: string;
  borderSubtle: string;
  boxShadow: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };

  // Syntax
  syntax: {
    keyword: string;
    string: string;
    number: string;
    comment: string;
    property: string;
    function: string;
    diffAddBg: string;
    diffAddMarker: string;
    diffRemoveBg: string;
    diffRemoveMarker: string;
    hunk: string;
  };
}

interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

function parseColor(color: string): Rgba | null {
  const value = color.trim();
  if (value.startsWith("#")) {
    let hex = value.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      hex = [...hex].map((c) => c + c).join("");
    }
    if (!/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(hex)) return null;
    const channel = (i: number) => Number.parseInt(hex.slice(i, i + 2), 16);
    return {
      r: channel(0),
      g: channel(2),
      b: channel(4),
      a: hex.length === 8 ? channel(6) / 255 : 1,
    };
  }
  const body = /^rgba?\(([^)]+)\)$/i.exec(value)?.[1];
  if (!body) return null;
  const [r, g, b, a = 1] = body
    .split(/[\s,/]+/)
    .filter(Boolean)
    .map(Number);
  if (r === undefined || g === undefined || b === undefined) return null;
  if ([r, g, b, a].some(Number.isNaN)) return null;
  return { r, g, b, a };
}

/** `color` at `alpha` opacity, multiplied with any alpha it already has. Unparseable colours pass through. */
export function withAlpha(color: string, alpha: number): string {
  const rgba = parseColor(color);
  if (!rgba) return color;
  const a = Number((rgba.a * alpha).toFixed(3));
  return `rgba(${rgba.r}, ${rgba.g}, ${rgba.b}, ${a})`;
}

/** Linear blend from `from` towards `to`; `t = 0` returns `from`. */
export function mix(from: string, to: string, t: number): string {
  const a = parseColor(from);
  const b = parseColor(to);
  if (!a || !b) return from;
  const channel = (x: number, y: number) =>
    Math.round(x + (y - x) * t)
      .toString(16)
      .padStart(2, "0");
  return `#${channel(a.r, b.r)}${channel(a.g, b.g)}${channel(a.b, b.b)}`;
}

function isDarkSurface(color: string): boolean {
  const rgba = parseColor(color);
  if (!rgba) return true;
  return (0.299 * rgba.r + 0.587 * rgba.g + 0.114 * rgba.b) / 255 < 0.5;
}

// PluginTheme only carries six colours, so every other surface is derived from
// the host foreground/accent with alpha. That keeps the plugin on-theme for any
// Paseo theme instead of hard-coding a palette that matches only one of them.
export function buildThemeTokens(
  colors: PluginSurfaceColors,
  preferences: EnhancerPreferences = DEFAULT_PREFERENCES,
): ExtendedThemeTokens {
  const isDark = isDarkSurface(colors.surface0);
  const fg = colors.foreground;
  const accent = ACCENT_PRESETS[preferences.accent] ?? colors.accent;
  const success = isDark ? "#4cb782" : "#1f8a5b";
  const warning = isDark ? "#d9a53f" : "#a36a00";
  const danger = colors.statusDanger;
  const tint = isDark ? 0.1 : 0.08;
  const edge = isDark ? 0.22 : 0.18;

  return {
    isDark,
    fontMono,
    fontCode: preferences.codeFont === "plain" ? fontMono : fontCode,
    fontUi: preferences.uiFont === "system" ? "System" : fontUi,

    surface0: colors.surface0,
    surface1: withAlpha(fg, isDark ? 0.03 : 0.025),
    surface2: withAlpha(fg, isDark ? 0.06 : 0.045),
    surfaceCode: isDark ? "rgba(0, 0, 0, 0.22)" : withAlpha(fg, 0.03),
    // Translucent so the blur behind them reads, but still dense enough to
    // keep text legible over whatever scrolls past.
    surfaceGlass: preferences.frostedGlass
      ? withAlpha(colors.surface0, isDark ? 0.52 : 0.64)
      : colors.surface0,
    surfaceCodeGlass: preferences.frostedGlass
      ? isDark
        ? "rgba(0, 0, 0, 0.34)"
        : withAlpha(fg, 0.05)
      : isDark
        ? "rgba(0, 0, 0, 0.22)"
        : withAlpha(fg, 0.03),

    foreground: fg,
    foregroundMuted: colors.foregroundMuted,
    foregroundSubtle: withAlpha(colors.foregroundMuted, 0.7),

    accent,
    accentForeground: colors.accentForeground,
    accentBg: withAlpha(accent, isDark ? 0.14 : 0.1),
    userSurface: withAlpha(fg, isDark ? 0.1 : 0.06),
    userBorder: withAlpha(fg, isDark ? 0.14 : 0.12),
    userText: fg,
    userTextMuted: colors.foregroundMuted,

    success,
    successBg: withAlpha(success, tint),
    successBorder: withAlpha(success, edge),

    warning,
    warningBg: withAlpha(warning, tint),
    warningBorder: withAlpha(warning, edge),

    danger,
    dangerBg: withAlpha(danger, tint),
    dangerBorder: withAlpha(danger, edge),

    border: withAlpha(fg, isDark ? 0.09 : 0.1),
    borderSubtle: withAlpha(fg, 0.06),
    boxShadow: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.12 : 0.08,
      shadowRadius: 5,
      elevation: 1,
    },

    // GitHub Dark Dimmed / GitHub Light
    syntax: {
      keyword: isDark ? "#f47067" : "#cf222e",
      string: isDark ? "#96d0ff" : "#0a3069",
      number: isDark ? "#6cb6ff" : "#0550ae",
      comment: isDark ? "#768390" : "#6e7781",
      property: isDark ? "#6cb6ff" : "#0550ae",
      function: isDark ? "#dcbdfb" : "#8250df",
      diffAddBg: withAlpha(success, tint),
      diffAddMarker: success,
      diffRemoveBg: withAlpha(danger, tint),
      diffRemoveMarker: danger,
      hunk: withAlpha(colors.foregroundMuted, 0.7),
    },
  };
}
