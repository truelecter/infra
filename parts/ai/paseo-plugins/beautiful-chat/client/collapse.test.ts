import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_COLLAPSE_KINDS,
  isCardExpanded,
  parseCollapseKinds,
} from "./collapse";

describe("parseCollapseKinds", () => {
  it("keeps reasoning open and collapses the rest by default", () => {
    const parsed = parseCollapseKinds(undefined);
    assert.equal(parsed.reasoning, false);
    assert.equal(parsed.shell, true);
    assert.deepEqual(parsed, DEFAULT_COLLAPSE_KINDS);
  });

  it("takes stored booleans and defaults every missing or malformed entry", () => {
    const parsed = parseCollapseKinds({
      reasoning: true,
      shell: false,
      files: "no",
    });
    assert.equal(parsed.reasoning, true);
    assert.equal(parsed.shell, false);
    assert.equal(parsed.files, true);
    assert.equal(parsed.other, true);
  });
});

describe("isCardExpanded", () => {
  const defaults = {
    collapseRunning: DEFAULT_COLLAPSE_KINDS,
    collapseFinished: DEFAULT_COLLAPSE_KINDS,
  };

  it("by default opens only reasoning, running or finished", () => {
    assert.equal(isCardExpanded("reasoning", "running", defaults), true);
    assert.equal(isCardExpanded("reasoning", "finished", defaults), true);
    assert.equal(isCardExpanded("shell", "running", defaults), false);
    assert.equal(isCardExpanded("shell", "finished", defaults), false);
  });

  it("reads the running and finished settings separately", () => {
    const settings = {
      collapseRunning: { ...DEFAULT_COLLAPSE_KINDS, shell: false },
      collapseFinished: DEFAULT_COLLAPSE_KINDS,
    };
    assert.equal(isCardExpanded("shell", "running", settings), true);
    assert.equal(isCardExpanded("shell", "finished", settings), false);
  });

  it("always opens a failed call", () => {
    assert.equal(isCardExpanded("shell", "failed", defaults), true);
  });
});
