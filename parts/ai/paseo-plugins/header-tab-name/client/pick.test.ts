import assert from "node:assert/strict";
import { test } from "node:test";
import { pickTabName } from "./pick.ts";

test("the focused pane's tab wins over earlier panes", () => {
  const tabs = [
    { label: "Left agent", focused: false },
    { label: "Right agent", focused: true },
  ];
  assert.equal(pickTabName(tabs, "Workspace"), "Right agent");
});

test("without a focused pane the first pane's tab is shown", () => {
  const tabs = [
    { label: "Left agent", focused: false },
    { label: "Right agent", focused: false },
  ];
  assert.equal(pickTabName(tabs, "Workspace"), "Left agent");
});

test("a tab named like the workspace is not repeated", () => {
  assert.equal(
    pickTabName([{ label: " Fix login ", focused: true }], "Fix login"),
    null,
  );
});

test("a tab whose title is still loading shows nothing", () => {
  assert.equal(
    pickTabName([{ label: "  ", focused: true }], "Workspace"),
    null,
  );
  assert.equal(pickTabName([], "Workspace"), null);
});
