import { describe, it } from "node:test";
import assert from "node:assert/strict";

const STORAGE_KEY = "paseo/beautiful-chat/preferences/v1";
const saved = new Map<string, string>();
saved.set(STORAGE_KEY, JSON.stringify({ fontScale: 1.1, collapseRunning: { shell: false } }));

const stubStorage: Pick<Storage, "getItem" | "setItem" | "removeItem"> = {
  getItem: (key) => saved.get(key) ?? null,
  setItem: (key, value) => {
    saved.set(key, value);
  },
  removeItem: (key) => {
    saved.delete(key);
  },
};
Object.defineProperty(globalThis, "localStorage", { value: stubStorage, configurable: true });

// Dynamic on purpose: the store reads storage once at module load, and static
// imports are hoisted above the stub, so they would load it with no storage.

const {
  loadPreferences,
  parseFontScale,
  preferences,
  scaleFont,
  subscribeEnhancerPreferences,
  updateEnhancerPreferences,
} = await import("./preferences");
const { buildThemeTokens } = await import("./components/theme-tokens");

describe("parseFontScale", () => {
  it("keeps a finite scale inside the range", () => {
    assert.equal(parseFontScale(1.1), 1.1);
  });

  it("clamps to 0.85..1.3", () => {
    assert.equal(parseFontScale(0.5), 0.85);
    assert.equal(parseFontScale(2), 1.3);
  });

  it("takes the default for anything that is not a finite number", () => {
    assert.equal(parseFontScale("1.2"), 1);
    assert.equal(parseFontScale(Number.NaN), 1);
    assert.equal(parseFontScale(Number.POSITIVE_INFINITY), 1);
    assert.equal(parseFontScale(undefined), 1);
  });
});

describe("loadPreferences", () => {
  it("reads the saved scale next to the collapse settings", () => {
    const loaded = loadPreferences();
    assert.equal(loaded.fontScale, 1.1);
    assert.equal(loaded.collapseRunning.shell, false);
    assert.equal(loaded.collapseRunning.reasoning, false);
  });
});

describe("updateEnhancerPreferences", () => {
  it("merges, saves, clamps, and notifies subscribers", () => {
    let calls = 0;
    const unsubscribe = subscribeEnhancerPreferences(() => {
      calls += 1;
    });
    updateEnhancerPreferences({ fontScale: 5 });
    assert.equal(calls, 1);
    assert.equal(preferences.value.fontScale, 1.3);
    assert.equal(preferences.value.collapseRunning.shell, false);
    assert.equal(JSON.parse(saved.get(STORAGE_KEY) ?? "{}").fontScale, 1.3);
    unsubscribe();
    updateEnhancerPreferences({ fontScale: 1 });
    assert.equal(calls, 1);
  });
});

describe("text scale", () => {
  it("is a no-op at scale 1", () => {
    assert.equal(scaleFont(12.5, 1), 12.5);
    const tokens = buildThemeTokens({
      surface0: "#000000",
      surface1: "#111111",
      surface2: "#222222",
      border: "#333333",
      foreground: "#ffffff",
      foregroundMuted: "#aaaaaa",
      accent: "#3b82f6",
      accentForeground: "#ffffff",
      statusSuccess: "#22c55e",
      statusWarning: "#f59e0b",
      statusDanger: "#ef4444",
    });
    assert.equal(tokens.fontScale, 1);
    assert.equal(tokens.fs(12.5), 12.5);
    assert.equal(tokens.fs(13), 13);
  });

  it("rounds to one decimal", () => {
    assert.equal(scaleFont(12.5, 1.1), 13.8);
    assert.equal(scaleFont(11, 1.25), 13.8);
    assert.equal(scaleFont(13, 0.9), 11.7);
  });
});
