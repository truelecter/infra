import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveFileIcon } from "./file-icon";

describe("resolveFileIcon", () => {
  it("prefers an exact file name over its extension", () => {
    assert.equal(resolveFileIcon("package.json"), "nodejs");
    assert.equal(resolveFileIcon("data.json"), "json");
    assert.equal(resolveFileIcon("Dockerfile"), "docker");
  });

  it("tries the longest extension first", () => {
    assert.equal(resolveFileIcon("src/app.test.ts"), "test-ts");
    assert.equal(resolveFileIcon("types/index.d.ts"), "typescript-def");
    assert.equal(resolveFileIcon("src/app.ts"), "typescript");
  });

  it("ignores directories, case, and a trailing selector or line range", () => {
    assert.equal(resolveFileIcon("/repo/SRC/Main.TS:55-85"), "typescript");
    assert.equal(resolveFileIcon("main.py 10-20"), "python");
    assert.equal(resolveFileIcon("C:\\code\\lib.rs"), "rust");
  });

  it("falls back to the language when the path says nothing", () => {
    assert.equal(resolveFileIcon(undefined, "bash"), "console");
    assert.equal(resolveFileIcon("script", "python"), "python");
    assert.equal(resolveFileIcon("", "tsx"), "react_ts");
  });

  it("lets the path win over the language", () => {
    assert.equal(resolveFileIcon("tsconfig.json", "json"), "tsconfig");
  });

  it("treats a trailing separator as a folder", () => {
    assert.equal(resolveFileIcon("src/"), "folder");
    assert.equal(resolveFileIcon("."), "folder");
  });

  it("returns null when nothing matches", () => {
    assert.equal(resolveFileIcon("notes.qqq"), null);
    assert.equal(resolveFileIcon(undefined, "qqq"), null);
    assert.equal(resolveFileIcon(), null);
  });
});
