import assert from "node:assert/strict";
import { test } from "node:test";
import { MOCHA, mochaTheme } from "./theme.ts";

test("every theme color is a six-digit hex string", () => {
  for (const [token, value] of Object.entries(mochaTheme.colors)) {
    assert.match(value ?? "", /^#[0-9a-f]{6}$/, token);
  }
});

test("every theme color comes from the Mocha palette", () => {
  const palette = new Set<string>(Object.values(MOCHA));
  for (const [token, value] of Object.entries(mochaTheme.colors)) {
    assert.ok(palette.has(value ?? ""), `${token} = ${value}`);
  }
});

test("theme is a dark theme with the mauve accent", () => {
  assert.equal(mochaTheme.appearance, "dark");
  assert.equal(mochaTheme.colors.background, "#1e1e2e");
  assert.equal(mochaTheme.colors.accent, "#cba6f7");
});
