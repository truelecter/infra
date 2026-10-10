import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BROWSER_STATE_ENTRY,
  browserStateMessage,
  ENABLE_BROWSER_DESCRIPTION,
  parseBrowserCommand,
  reconcileBrowserTools,
  restoreBrowserState,
} from "./browser-tools.ts";

const REGISTERED = [
  "read",
  "set_title",
  "browser_click",
  "list_agents",
  "browser_snapshot",
];

test("off drops active browser tools and keeps the rest in order", () => {
  assert.deepEqual(reconcileBrowserTools(REGISTERED, REGISTERED, false), [
    "read",
    "set_title",
    "list_agents",
  ]);
});

test("off with no browser tools active changes nothing", () => {
  assert.equal(
    reconcileBrowserTools(["read", "list_agents"], REGISTERED, false),
    null,
  );
});

test("on adds registered browser tools that are not active", () => {
  assert.deepEqual(
    reconcileBrowserTools(["read", "browser_click"], REGISTERED, true),
    ["read", "browser_click", "browser_snapshot"],
  );
});

test("on with every browser tool active, or none registered, changes nothing", () => {
  assert.equal(reconcileBrowserTools(REGISTERED, REGISTERED, true), null);
  assert.equal(reconcileBrowserTools(["read"], ["read", "bash"], true), null);
});

test("the state comes from the last entry on the branch, default off", () => {
  assert.equal(restoreBrowserState([]), false);
  const entry = (enabled: unknown) => ({
    type: "custom",
    customType: BROWSER_STATE_ENTRY,
    data: { enabled },
  });
  assert.equal(restoreBrowserState([entry(true)]), true);
  assert.equal(
    restoreBrowserState([entry(true), { type: "message" }, entry(false)]),
    false,
  );
  assert.equal(restoreBrowserState([entry(true), entry("yes")]), true);
  assert.equal(
    restoreBrowserState([
      { type: "custom", customType: "other", data: { enabled: true } },
    ]),
    false,
  );
});

test("the command takes on, off, or nothing to toggle", () => {
  assert.deepEqual(parseBrowserCommand("", false), { ok: true, enabled: true });
  assert.deepEqual(parseBrowserCommand("  ", true), {
    ok: true,
    enabled: false,
  });
  assert.deepEqual(parseBrowserCommand("ON", false), {
    ok: true,
    enabled: true,
  });
  assert.deepEqual(parseBrowserCommand("off", true), {
    ok: true,
    enabled: false,
  });
  assert.deepEqual(parseBrowserCommand("maybe", true), {
    ok: false,
    error: "Usage: /paseo-browser [on|off]",
  });
});

test("the state message counts the browser tools", () => {
  assert.equal(
    browserStateMessage(false, REGISTERED),
    "Paseo browser tools off.",
  );
  assert.match(browserStateMessage(true, REGISTERED), /on: 2 browser_\* tools/);
  assert.match(browserStateMessage(true, ["read"]), /registered none/);
});

test("the tool description stays short and plain", () => {
  assert.ok(ENABLE_BROWSER_DESCRIPTION.length < 260);
  assert.ok(!/[\u2013\u2014\u2026]/.test(ENABLE_BROWSER_DESCRIPTION));
});
