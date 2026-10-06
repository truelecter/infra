import { useSyncExternalStore } from "react";
import { DEFAULT_COLLAPSE_KINDS, parseCollapseKinds, type CollapseKinds } from "./collapse";

export interface EnhancerPreferences {
  /** Which kinds of card stay closed while their call is still running. */
  collapseRunning: CollapseKinds;
  /** Which kinds of card close themselves once they finish. */
  collapseFinished: CollapseKinds;
  /** Multiplies every text size and line height in the plugin's cards. */
  fontScale: number;
}

const STORAGE_KEY = "paseo/beautiful-chat/preferences/v1";

export const FONT_SCALE_MIN = 0.85;
export const FONT_SCALE_MAX = 1.3;

const DEFAULT_PREFERENCES: Readonly<EnhancerPreferences> = {
  collapseRunning: DEFAULT_COLLAPSE_KINDS,
  collapseFinished: DEFAULT_COLLAPSE_KINDS,
  fontScale: 1,
};

/** A stored scale, clamped to the supported range; anything else is the default. */
export function parseFontScale(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULT_PREFERENCES.fontScale;
  return Math.min(FONT_SCALE_MAX, Math.max(FONT_SCALE_MIN, value));
}

function storage(): Storage | undefined {
  // React Native has no `localStorage`; the web and desktop builds do.
  return typeof localStorage === "undefined" ? undefined : localStorage;
}

/** `size` at `scale`, rounded to one decimal; scale 1 returns `size` unchanged. */
export function scaleFont(size: number, scale: number): number {
  return Math.round(size * scale * 10) / 10;
}

/** Reads the saved preferences; anything missing or malformed takes its default. */
export function loadPreferences(): EnhancerPreferences {
  try {
    const stored = storage()?.getItem(STORAGE_KEY);
    if (!stored) return { ...DEFAULT_PREFERENCES };
    const parsed = JSON.parse(stored) as Partial<Record<keyof EnhancerPreferences, unknown>>;
    return {
      collapseRunning: parseCollapseKinds(parsed.collapseRunning),
      collapseFinished: parseCollapseKinds(parsed.collapseFinished),
      fontScale: parseFontScale(parsed.fontScale),
    };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

let current: EnhancerPreferences = loadPreferences();
const listeners = new Set<() => void>();

/** The current preferences, for reads outside React. */
export const preferences = {
  get value(): EnhancerPreferences {
    return current;
  },
};

export function updateEnhancerPreferences(update: Partial<EnhancerPreferences>): void {
  current = {
    ...current,
    ...update,
    ...(update.fontScale !== undefined ? { fontScale: parseFontScale(update.fontScale) } : {}),
  };
  try {
    storage()?.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Storage can be disabled; the change still holds for this session.
  }
  for (const listener of listeners) listener();
}

export function subscribeEnhancerPreferences(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useEnhancerPreferences(): EnhancerPreferences {
  return useSyncExternalStore(subscribeEnhancerPreferences, () => current, () => current);
}
