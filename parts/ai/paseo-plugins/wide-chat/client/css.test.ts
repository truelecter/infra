import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildOverrideCss,
  collectSelectors,
  maxWidthValue,
  type RuleLike,
} from "./css.ts";

function rule(selectorText: string, maxWidth: string): RuleLike {
  return {
    selectorText,
    style: {
      getPropertyValue: (property) =>
        property === "max-width" ? maxWidth : "",
    },
  };
}

test("collects selectors capped at 820px, including inside media queries", () => {
  const rules: RuleLike[] = [
    rule(".unistyles_a", "820px"),
    rule(".unistyles_b", "400px"),
    rule(".r-1ab2", "820px"),
    { cssRules: [rule(".unistyles_c", "820px"), rule(".unistyles_d", "")] },
    { selectorText: ".no-style" },
  ];
  assert.deepEqual([...collectSelectors(rules)].sort(), [
    ".r-1ab2",
    ".unistyles_a",
    ".unistyles_c",
  ]);
});

test("ignores rules whose max-width merely contains 820", () => {
  assert.equal(
    collectSelectors([rule(".a", "1820px"), rule(".b", "820%")]).size,
    0,
  );
});

test("max width never drops below stock", () => {
  assert.equal(maxWidthValue({ percent: 90, maxPx: 0 }), "max(820px, 90%)");
  assert.equal(
    maxWidthValue({ percent: 80, maxPx: 1400 }),
    "max(820px, min(80%, 1400px))",
  );
});

test("override css widens outer containers and lets nested ones fill their parent", () => {
  const css = buildOverrideCss([".b", ".a"], { percent: 90, maxPx: 0 });
  assert.equal(
    css,
    ":is(.a,.b){max-width:max(820px, 90%)!important}:is(.a,.b) :is(.a,.b){max-width:none!important}",
  );
});

test("no selectors, no css", () => {
  assert.equal(buildOverrideCss([], { percent: 90, maxPx: 0 }), "");
});
