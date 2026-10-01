import { test } from "node:test";
import assert from "node:assert/strict";
import { AskGate, MAX_BLOCKS_IN_A_ROW, MIN_PREAMBLE_CHARS, checkAsk, textBefore } from "./preamble.ts";

const explanation = "x".repeat(MIN_PREAMBLE_CHARS);
const call = (id: string) => ({ type: "toolCall", id, name: "ask", arguments: {} });
const bare = { role: "assistant", content: [{ type: "thinking", thinking: explanation }, call("a")] };
const explained = { role: "assistant", content: [{ type: "text", text: explanation }, call("a")] };
const finalExplanation = { role: "assistant", content: [{ type: "text", text: explanation }] };

test("blocks an ask whose explanation exists only in thinking", () => {
  assert.ok(checkAsk(bare, "a")?.startsWith("Blocked:"));
});

test("allows an ask preceded by enough visible text", () => {
  assert.equal(checkAsk(explained, "a"), undefined);
});

test("blocks a one-line apology before the form", () => {
  const message = { role: "assistant", content: [{ type: "text", text: "Sorry, my mistake again." }, call("a")] };
  assert.ok(checkAsk(message, "a")?.startsWith("Blocked:"));
});

test("counts only text before the call, trimmed", () => {
  const padded = `\n\n${"y".repeat(MIN_PREAMBLE_CHARS - 1)}   \n`;
  const message = {
    role: "assistant",
    content: [{ type: "text", text: padded }, call("a"), { type: "text", text: explanation }],
  };
  assert.equal(textBefore(message, "a"), MIN_PREAMBLE_CHARS - 1);
  assert.ok(checkAsk(message, "a")?.startsWith("Blocked:"));
});

test("text written before an earlier call still counts for a later ask", () => {
  const message = { role: "assistant", content: [{ type: "text", text: explanation }, call("first"), call("second")] };
  assert.equal(checkAsk(message, "second"), undefined);
});

test("a call that is not in the message is left alone", () => {
  assert.equal(textBefore(bare, "b"), undefined);
  assert.equal(checkAsk(bare, "b"), undefined);
});

test("block, explaining final reply, continuation: the next bare ask goes through once", () => {
  const gate = new AskGate();
  assert.ok(gate.check(bare, "a"));
  assert.equal(gate.runEnded(finalExplanation), true);
  gate.runStarted();
  assert.equal(gate.check(bare, "a"), undefined);
  assert.ok(gate.check(bare, "a"), "enforced again after the explained ask");
});

test("no continuation when the run ends without an explaining reply", () => {
  const short = { role: "assistant", content: [{ type: "text", text: "Next I'll ask." }] };
  const withTool = { role: "assistant", content: [{ type: "text", text: explanation }, call("b")] };
  for (const last of [short, withTool, undefined]) {
    const gate = new AskGate();
    gate.check(bare, "a");
    assert.equal(gate.runEnded(last), false);
    gate.runStarted();
    assert.ok(gate.check(bare, "a"), "still enforced");
  }
});

test("no continuation when nothing was blocked, or the retry passed", () => {
  const gate = new AskGate();
  assert.equal(gate.runEnded(finalExplanation), false);
  gate.check(bare, "a");
  gate.check(explained, "a");
  assert.equal(gate.runEnded(finalExplanation), false);
});

test("an explained run that never asks does not carry the pass further", () => {
  const gate = new AskGate();
  gate.check(bare, "a");
  gate.runEnded(finalExplanation);
  gate.runStarted();
  assert.equal(gate.runEnded(finalExplanation), false);
  gate.runStarted();
  assert.ok(gate.check(bare, "a"));
});

test("after the cap in one run, one bare ask goes through, then enforcement resumes", () => {
  const gate = new AskGate();
  for (let i = 0; i < MAX_BLOCKS_IN_A_ROW; i++) assert.ok(gate.check(bare, "a"), `block ${i + 1}`);
  assert.equal(gate.check(bare, "a"), undefined);
  assert.ok(gate.check(bare, "a"));
});

test("a new run starts the block count over", () => {
  const gate = new AskGate();
  for (let i = 0; i < MAX_BLOCKS_IN_A_ROW; i++) gate.check(bare, "a");
  gate.runEnded(undefined);
  gate.runStarted();
  assert.ok(gate.check(bare, "a"));
});
