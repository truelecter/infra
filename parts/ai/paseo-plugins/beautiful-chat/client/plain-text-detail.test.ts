import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { extractPlainAskAnswers, readPlainTextDetail } from "./plain-text-detail";

describe("readPlainTextDetail", () => {
  it("reads the label and text of a plain_text detail", () => {
    assert.deepEqual(readPlainTextDetail({ type: "plain_text", label: "Pick a color", text: "A" }), {
      label: "Pick a color",
      text: "A",
    });
  });

  it("ignores the raw unknown detail Paseo 0.10 sends", () => {
    assert.equal(readPlainTextDetail({ type: "unknown", input: {}, output: "2" }), null);
  });

  it("treats blank fields as missing", () => {
    assert.deepEqual(readPlainTextDetail({ type: "plain_text", label: "  ", text: "" }), {
      label: undefined,
      text: undefined,
    });
  });
});

describe("extractPlainAskAnswers", () => {
  it("takes the answer after the question line", () => {
    assert.deepEqual(extractPlainAskAnswers("Pick a color\nA: red"), ["A: red"]);
  });

  it("reads one answer per question and skips unanswered ones", () => {
    const text = "Pick a color\nA: red, B: blue\n\nPick a size\nNo selection\n\nName it\nmy own words";
    assert.deepEqual(extractPlainAskAnswers(text), ["A: red, B: blue", "my own words"]);
  });

  it("returns nothing for prose without a question line", () => {
    assert.deepEqual(extractPlainAskAnswers("User selected: A: red"), []);
    assert.deepEqual(extractPlainAskAnswers(undefined), []);
  });
});
