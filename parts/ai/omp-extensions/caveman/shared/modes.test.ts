import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { LEVELS, SECTION_MESSAGE_TYPE, buildPrompt, detectToggle, needsSection, parseModeArg } from "./modes.ts";

describe("parseModeArg", () => {
  it("accepts every level and off", () => {
    for (const level of LEVELS) assert.equal(parseModeArg(level), level);
    assert.equal(parseModeArg("off"), "off");
  });

  it("accepts aliases and ignores case and spaces", () => {
    assert.equal(parseModeArg(" Wenyan "), "wenyan-full");
    assert.equal(parseModeArg("STOP"), "off");
    assert.equal(parseModeArg("normal"), "off");
  });

  it("rejects unknown values", () => {
    assert.equal(parseModeArg("loud"), null);
    assert.equal(parseModeArg("commit"), null);
  });
});

describe("detectToggle", () => {
  it("turns off on stop phrases", () => {
    assert.equal(detectToggle("stop caveman", "full"), "off");
    assert.equal(detectToggle("please stop talking like caveman", "full"), "off");
    assert.equal(detectToggle("Normal mode please", "ultra"), "off");
  });

  it("turns on at the given level", () => {
    assert.equal(detectToggle("talk like caveman", "ultra"), "ultra");
    assert.equal(detectToggle("caveman mode", "lite"), "lite");
  });

  it("leaves other prompts and slash commands alone", () => {
    assert.equal(detectToggle("fix the auth middleware", "full"), null);
    assert.equal(detectToggle("/caveman off", "full"), null);
    assert.equal(detectToggle("", "full"), null);
  });
});

describe("buildPrompt", () => {
  it("names the level and its intensity rule", () => {
    const prompt = buildPrompt("ultra");
    assert.match(prompt, /Caveman mode \(ultra\)/);
    assert.match(prompt, /Intensity ultra: Abbreviate prose words/);
  });

  it("describes every level", () => {
    for (const level of LEVELS) assert.doesNotMatch(buildPrompt(level), /undefined/);
  });
});

describe("needsSection", () => {
  const command = { role: "custom", customType: "gsd-native-progress" };

  it("adds the section to a turn started by an extension command", () => {
    assert.equal(needsSection("full", [command], ["base prompt"]), true);
  });

  it("skips requests whose system prompt has a section, at any level", () => {
    assert.equal(needsSection("full", [command], ["base prompt", buildPrompt("lite")]), false);
  });

  it("never adds the section twice or when off", () => {
    const injected = { role: "custom", customType: SECTION_MESSAGE_TYPE };
    assert.equal(needsSection("full", [injected, command], ["base prompt"]), false);
    assert.equal(needsSection("off", [command], ["base prompt"]), false);
  });
});
