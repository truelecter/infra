import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { buildNotice, diffLeaves, nixLine, toNix } from "./notice.ts";

describe("diffLeaves", () => {
  it("names only the entries of a record that changed", () => {
    assert.deepEqual(
      diffLeaves({ default: "a", smol: "b" }, { default: "c", smol: "b", slow: "d" }, ["modelRoles"]),
      [
        { path: ["modelRoles", "default"], value: "c" },
        { path: ["modelRoles", "slow"], value: "d" },
      ],
    );
  });

  it("reports a removed setting with an undefined value", () => {
    assert.deepEqual(diffLeaves("dark", undefined, ["theme", "dark"]), [{ path: ["theme", "dark"], value: undefined }]);
  });

  it("compares arrays whole and finds nothing when values match", () => {
    assert.deepEqual(diffLeaves(["a"], ["a", "b"], ["x"]), [{ path: ["x"], value: ["a", "b"] }]);
    assert.deepEqual(diffLeaves({ a: [1] }, { a: [1] }, []), []);
  });

  it("expands a record that replaced a scalar into its leaves", () => {
    assert.deepEqual(diffLeaves(undefined, { a: 1, b: { c: true } }, ["s"]), [
      { path: ["s", "a"], value: 1 },
      { path: ["s", "b", "c"], value: true },
    ]);
  });
});

describe("toNix", () => {
  it("renders scalars, lists, and attribute sets", () => {
    assert.equal(toNix(["web/parallel", 2, false, null]), '[ "web/parallel" 2 false null ]');
    assert.equal(toNix({ enabled: true, "a.b": "x" }), '{ enabled = true; "a.b" = "x"; }');
  });

  it("escapes Nix interpolation in strings", () => {
    assert.equal(toNix("echo ${HOME}"), '"echo \\${HOME}"');
  });
});

describe("nixLine", () => {
  it("quotes attribute names Nix would misread", () => {
    assert.equal(
      nixLine({ path: ["providers", "modelOverrides", "global.anthropic.claude"], value: "x" }),
      'programs.oh-my-pi.settings.providers.modelOverrides."global.anthropic.claude" = "x";',
    );
  });

  it("asks to remove a setting that was unset", () => {
    assert.equal(nixLine({ path: ["theme", "dark"], value: undefined }), "remove programs.oh-my-pi.settings.theme.dark");
  });
});

describe("buildNotice", () => {
  it("says the change is not saved and gives the Nix line for each changed value", () => {
    const notice = buildNotice(
      "modelRoles",
      [
        { path: ["modelRoles", "default"], value: "p/m:high" },
        { path: ["modelRoles", "smol"], value: undefined },
      ],
      "~/.omp/agent/config.yml",
    );
    assert.match(notice, /^modelRoles changed for this session only: ~\/\.omp\/agent\/config\.yml is managed/);
    assert.match(notice, /\n  programs\.oh-my-pi\.settings\.modelRoles\.default = "p\/m:high";\n  remove programs\.oh-my-pi\.settings\.modelRoles\.smol$/);
  });
});
