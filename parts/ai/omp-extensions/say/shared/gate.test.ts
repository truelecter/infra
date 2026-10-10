import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AskGate,
  MAX_BLOCKS_IN_A_ROW,
  MIN_TEXT_CHARS,
  NO_EXPLANATION_REASON,
  SAME_RESPONSE_REASON,
  isExplainingReply,
  textBefore,
} from "./gate.ts";

const explanation = "x".repeat(MIN_TEXT_CHARS);
const call = (id: string) => ({
  type: "toolCall",
  id,
  name: "ask",
  arguments: {},
});

test("reply text counts only before the call, trimmed, and thinking never counts", () => {
  const padded = `\n\n${"y".repeat(MIN_TEXT_CHARS - 1)}   \n`;
  const message = {
    role: "assistant",
    content: [
      { type: "thinking", thinking: explanation },
      { type: "text", text: padded },
      call("a"),
      { type: "text", text: explanation },
    ],
  };
  assert.equal(textBefore(message, "a"), MIN_TEXT_CHARS - 1);
  assert.equal(textBefore(message, "b"), undefined, "call not in this message");
});

test("an explaining reply has enough text and no tool calls", () => {
  assert.equal(
    isExplainingReply({ content: [{ type: "text", text: explanation }] }),
    true,
  );
  assert.equal(
    isExplainingReply({ content: [{ type: "text", text: "Next I'll ask." }] }),
    false,
  );
  assert.equal(
    isExplainingReply({
      content: [{ type: "text", text: explanation }, call("a")],
    }),
    false,
  );
  assert.equal(isExplainingReply(undefined), false);
});

test("a bare ask is blocked and asked for a say", () => {
  const gate = new AskGate();
  assert.equal(gate.check(0), NO_EXPLANATION_REASON);
});

test("enough reply text before the call lets it through", () => {
  const gate = new AskGate();
  assert.equal(gate.check(MIN_TEXT_CHARS), undefined);
  assert.equal(gate.check(MIN_TEXT_CHARS - 1), NO_EXPLANATION_REASON);
});

test("say in an earlier response covers one ask; the next form needs its own", () => {
  const gate = new AskGate();
  gate.responseStarted();
  gate.sayCalled();
  gate.sayShown();
  gate.responseStarted();
  assert.equal(gate.check(0), undefined);
  gate.askAnswered();
  gate.responseStarted();
  assert.equal(gate.check(0), NO_EXPLANATION_REASON);
});

test("a cancelled form keeps the explanation for the re-ask", () => {
  const gate = new AskGate();
  gate.sayShown();
  gate.responseStarted();
  assert.equal(gate.check(0), undefined);
  // no askAnswered(): the ask failed or was cancelled
  gate.responseStarted();
  assert.equal(gate.check(0), undefined);
});

test("ask in the same response as say is blocked even with text, then passes next response", () => {
  const gate = new AskGate();
  gate.responseStarted();
  gate.sayCalled();
  assert.equal(gate.check(MIN_TEXT_CHARS), SAME_RESPONSE_REASON);
  gate.sayShown();
  gate.responseStarted();
  assert.equal(gate.check(0), undefined);
});

test("an explaining final reply covers the first ask of the next run only", () => {
  const gate = new AskGate();
  gate.runEnded({ content: [{ type: "text", text: explanation }] });
  gate.runStarted();
  gate.responseStarted();
  assert.equal(gate.check(0), undefined);
  gate.askAnswered();
  assert.equal(gate.check(0), NO_EXPLANATION_REASON);
});

test("a say that no ask used does not carry into the next run", () => {
  const gate = new AskGate();
  gate.sayShown();
  gate.runEnded({ content: [{ type: "text", text: "Done." }] });
  gate.runStarted();
  gate.responseStarted();
  assert.equal(gate.check(0), NO_EXPLANATION_REASON);
});

test("after the cap one bare ask goes through, then enforcement resumes", () => {
  const gate = new AskGate();
  for (let i = 0; i < MAX_BLOCKS_IN_A_ROW; i++)
    assert.ok(gate.check(0), `block ${i + 1}`);
  assert.equal(gate.check(0), undefined);
  assert.ok(gate.check(0));
});

test("a passing ask and a new run both reset the block count", () => {
  const gate = new AskGate();
  for (let i = 0; i < MAX_BLOCKS_IN_A_ROW - 1; i++) gate.check(0);
  gate.check(MIN_TEXT_CHARS);
  for (let i = 0; i < MAX_BLOCKS_IN_A_ROW; i++)
    assert.ok(gate.check(0), `after pass, block ${i + 1}`);
  gate.runStarted();
  assert.ok(
    gate.check(0),
    "new run blocks again instead of passing on the cap",
  );
});
