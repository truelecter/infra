import assert from "node:assert/strict";
import { test } from "node:test";

import {
  type Message,
  MODE_ENTRY,
  modeChanges,
  modesByTurn,
  OFF_NOTICE,
  parseMode,
  REMINDERS,
  withModeTexts,
  withSubagentRules,
} from "./modes.ts";

const RULES = {
  full: "<rules full>",
  high: "<rules high>",
  ultracave: "<rules ultra>",
};
/** What a mode's first turn gains: its rules, then its reminder. */
const first = (mode: keyof typeof RULES) =>
  `${RULES[mode]}\n\n${REMINDERS[mode]}`;
const user = (
  text: string,
  timestamp: number,
  extra: Partial<Message> = {},
): Message => ({
  role: "user",
  content: text,
  attribution: "user",
  timestamp,
  ...extra,
});
const reply = (timestamp: number): Message => ({
  role: "assistant",
  content: [{ type: "text", text: "ok" }],
  timestamp,
});
const switchTo = (mode: string, at: number) => ({
  type: "custom",
  customType: MODE_ENTRY,
  data: { mode, at },
});

/** The text each human turn gained, in order. */
function added(
  messages: Message[],
  out: Message[] | undefined,
): (string | undefined)[] {
  return messages.flatMap((message, i) => {
    if (message.role !== "user") return [];
    const after = out?.[i].content;
    return [
      typeof after === "string" && after !== message.content
        ? after.slice(String(message.content).length + 2)
        : undefined,
    ];
  });
}

test("parseMode accepts names and aliases, rejects the rest", () => {
  assert.equal(parseMode(" Ultra "), "ultracave");
  assert.equal(parseMode("caveman"), "full");
  assert.equal(parseMode("nothing"), "off");
  assert.equal(parseMode("medium"), undefined);
  assert.equal(parseMode(undefined), undefined);
});

test("modeChanges keeps valid switches, oldest first", () => {
  const changes = modeChanges([
    switchTo("high", 20),
    { type: "message" },
    switchTo("bogus", 25),
    { type: "custom", customType: "other", data: { mode: "off", at: 1 } },
    switchTo("ultra", 10),
    { type: "custom", customType: MODE_ENTRY, data: { mode: "off" } },
  ]);
  assert.deepEqual(changes, [
    { mode: "ultracave", at: 10 },
    { mode: "high", at: 20 },
  ]);
});

test("rules on the first turn of a mode, reminders after, off notice once", () => {
  const messages = [
    user("a", 1),
    reply(2),
    user("b", 3),
    user("c", 5),
    user("d", 7),
    user("e", 9),
  ];
  const changes = [
    { mode: "high" as const, at: 4 },
    { mode: "off" as const, at: 6 },
  ];
  const { modes, current } = modesByTurn(messages, "full", changes);
  assert.equal(current, "off");
  assert.deepEqual(added(messages, withModeTexts(messages, modes, RULES)), [
    first("full"),
    REMINDERS.full,
    first("high"),
    OFF_NOTICE,
    undefined,
  ]);
});

test("a switch-off phrase turns caveman off until the next /caveman switch", () => {
  const messages = [
    user("a", 1),
    user("ok, stop caveman", 2),
    user("b", 3),
    user("c", 5),
  ];
  const { modes } = modesByTurn(messages, "ultracave", [
    { mode: "ultracave", at: 4 },
  ]);
  assert.deepEqual(added(messages, withModeTexts(messages, modes, RULES)), [
    first("ultracave"),
    OFF_NOTICE,
    undefined,
    first("ultracave"),
  ]);
});

test("agent-made user turns are skipped and keep no mode", () => {
  const messages = [
    user("go", 1),
    user("Continue.", 2, { attribution: "agent" }),
    user("auto", 3, { synthetic: true }),
    user("next", 4),
  ];
  const { modes } = modesByTurn(messages, "high", []);
  assert.deepEqual(modes, ["high", undefined, undefined, "high"]);
  assert.deepEqual(added(messages, withModeTexts(messages, modes, RULES)), [
    first("high"),
    undefined,
    undefined,
    REMINDERS.high,
  ]);
});

test("earlier turns render identically as the history grows (prompt cache stays valid)", () => {
  const short = [user("a", 1), user("b", 3)];
  const long = [...short, reply(4), user("c", 5)];
  const changes = [{ mode: "ultracave" as const, at: 4.5 }];
  const first = withModeTexts(
    short,
    modesByTurn(short, "full", changes).modes,
    RULES,
  );
  const later = withModeTexts(
    long,
    modesByTurn(long, "full", changes).modes,
    RULES,
  );
  assert.deepEqual(later?.slice(0, 2), first);
});

test("current mode includes a switch made after the last message", () => {
  assert.equal(
    modesByTurn([user("a", 1)], "full", [{ mode: "high", at: 2 }]).current,
    "high",
  );
  assert.equal(modesByTurn([], "off", []).current, "off");
});

test("off from the start adds nothing", () => {
  const messages = [user("a", 1), user("b", 2)];
  assert.equal(
    withModeTexts(messages, modesByTurn(messages, "off", []).modes, RULES),
    undefined,
  );
});

test("block content gains a text block", () => {
  const image = { type: "image", data: "x", mimeType: "image/png" };
  const messages = [
    user("", 1, { content: [{ type: "text", text: "look" }, image] }),
  ];
  const out = withModeTexts(
    messages,
    modesByTurn(messages, "full", []).modes,
    RULES,
  );
  assert.deepEqual(out?.[0].content, [
    { type: "text", text: "look" },
    image,
    { type: "text", text: first("full") },
  ]);
});

test("subagent rules go on the first user message only, whoever wrote it", () => {
  const messages = [
    user("task", 1, { attribution: "agent" }),
    reply(2),
    user("more", 3),
  ];
  const out = withSubagentRules(messages, "<r>");
  assert.deepEqual(
    out?.map((m) => m.content),
    ["task\n\n<r>", messages[1].content, "more"],
  );
  assert.equal(withSubagentRules([reply(1)], "<r>"), undefined);
});
