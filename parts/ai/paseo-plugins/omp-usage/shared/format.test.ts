import assert from "node:assert/strict";
import { test } from "node:test";
import { compactNumber, folderName } from "./format.ts";

test("compactNumber keeps three significant digits per unit", () => {
  assert.equal(compactNumber(4_941_700_000), "4.94B");
  assert.equal(compactNumber(20_420_000), "20.4M");
  assert.equal(compactNumber(133_700_000), "134M");
  assert.equal(compactNumber(1_000), "1K");
  assert.equal(compactNumber(812), "812");
});

test("folderName drops the leading dash and the top folder", () => {
  assert.equal(folderName("-Projects-agentic-stuff"), "agentic-stuff");
  assert.equal(
    folderName("-Workspace-research-terraform"),
    "research-terraform",
  );
  assert.equal(folderName("/private-tmp/"), "/private-tmp/");
});
