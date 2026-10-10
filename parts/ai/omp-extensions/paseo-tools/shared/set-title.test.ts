import { test } from "node:test";
import assert from "node:assert/strict";
import type { CliResult } from "./paseo-cli.ts";
import {
  MAX_TITLE_LENGTH,
  normalizeTitle,
  setTitle,
  setTitleDescription,
  toolsForAgent,
} from "./set-title.ts";

const ID = "f6be7cb5-31fd-417f-81ad-9ffdcd326416";

function deps(
  overrides: {
    kind?: "main" | "sub";
    cli?: CliResult;
    sessionError?: Error;
  } = {},
) {
  const calls: { cli: string[][]; session: string[] } = {
    cli: [],
    session: [],
  };
  return {
    calls,
    deps: {
      agentId: ID,
      agentKind: overrides.kind ?? ("main" as const),
      runCli: async (args: string[]) => {
        calls.cli.push(args);
        return (
          overrides.cli ?? {
            ok: true as const,
            stdout: '{"agentId":"x","name":"y"}',
          }
        );
      },
      setSessionName: async (title: string) => {
        calls.session.push(title);
        if (overrides.sessionError) throw overrides.sessionError;
      },
    },
  };
}

test("collapses whitespace and newlines", () => {
  assert.deepEqual(normalizeTitle("  Fix\n\tbilling   retries \n"), {
    ok: true,
    title: "Fix billing retries",
  });
});

test("rejects an empty title", () => {
  assert.equal(normalizeTitle(" \n ").ok, false);
});

test("accepts exactly the limit, rejects one more without cutting", () => {
  assert.equal(normalizeTitle("a".repeat(MAX_TITLE_LENGTH)).ok, true);
  const long = normalizeTitle("a".repeat(MAX_TITLE_LENGTH + 10));
  assert.equal(long.ok, false);
  assert.match(
    !long.ok ? long.error : "",
    /70 characters, the limit is 60\. Shorten it/,
  );
});

test("counts code points, not UTF-16 units", () => {
  assert.equal(normalizeTitle("🚀".repeat(MAX_TITLE_LENGTH)).ok, true);
});

test("renames through the CLI, then the session", async () => {
  const { calls, deps: d } = deps();
  const result = await setTitle(" Auth token\nrefresh ", d);
  assert.deepEqual(result, {
    text: 'Renamed to "Auth token refresh"',
    isError: false,
  });
  assert.deepEqual(calls.cli, [
    ["agent", "update", ID, "--name", "Auth token refresh", "--json"],
  ]);
  assert.deepEqual(calls.session, ["Auth token refresh"]);
});

test("an invalid title never reaches the CLI", async () => {
  const { calls, deps: d } = deps();
  const result = await setTitle("x".repeat(61), d);
  assert.equal(result.isError, true);
  assert.deepEqual(calls.cli, []);
});

test("a CLI failure is a tool error and leaves the session name alone", async () => {
  const { calls, deps: d } = deps({
    cli: { ok: false, error: "Agent not found" },
  });
  const result = await setTitle("New title", d);
  assert.equal(result.isError, true);
  assert.match(result.text, /Agent not found/);
  assert.deepEqual(calls.session, []);
});

test("a session name failure is reported, not a tool error", async () => {
  const { deps: d } = deps({ sessionError: new Error("disk full") });
  const result = await setTitle("New title", d);
  assert.equal(result.isError, false);
  assert.match(result.text, /session name was not updated: disk full/);
});

test("a subagent is refused and renames nothing", async () => {
  const { calls, deps: d } = deps({ kind: "sub" });
  const result = await setTitle("New title", d);
  assert.equal(result.isError, true);
  assert.deepEqual(calls, { cli: [], session: [] });
});

test("subagents lose the main-only tools, the main agent keeps its tools", () => {
  const mainOnly = ["set_title", "enable_browser_tools"];
  assert.deepEqual(
    toolsForAgent(
      "sub",
      ["read", "set_title", "bash", "enable_browser_tools"],
      mainOnly,
    ),
    ["read", "bash"],
  );
  assert.equal(toolsForAgent("sub", ["read"], mainOnly), null);
  assert.equal(toolsForAgent("main", ["read", "set_title"], mainOnly), null);
});

test("the description names the agent id and the limit", () => {
  const text = setTitleDescription(ID);
  assert.ok(text.includes(`\`${ID}\``));
  assert.ok(text.includes("At most 60 characters"));
  assert.ok(!/[\u2013\u2014\u2026]/.test(text));
});
