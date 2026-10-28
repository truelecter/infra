import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { logicalLineBoxes } from "./code-layout";

const at = (y: number, text: string) => ({ text, y, height: 18 });

describe("logicalLineBoxes", () => {
  it("groups wrapped visual lines under their source line (Android, newline kept)", () => {
    const lines = [
      "const a = 1;",
      "",
      "a very long line that wraps twice",
      "end",
    ];
    const layout = [
      at(0, "const a = 1;\n"),
      at(18, "\n"),
      at(36, "a very long "),
      at(54, "line that wraps "),
      at(72, "twice\n"),
      at(90, "end"),
    ];
    assert.deepEqual(logicalLineBoxes(lines, layout), [
      { top: 0, height: 18 },
      { top: 18, height: 18 },
      { top: 36, height: 54 },
      { top: 90, height: 18 },
    ]);
  });

  it("trusts the newlines when the drawn characters differ from the source", () => {
    const lines = ["\tx", "y"];
    const layout = [at(0, "    x\n"), at(18, "y")];
    assert.deepEqual(logicalLineBoxes(lines, layout), [
      { top: 0, height: 18 },
      { top: 18, height: 18 },
    ]);
  });

  it("matches by offsets when the layout leaves the newlines out (iOS)", () => {
    const lines = ["abcdef", "", "x"];
    const layout = [at(0, "abc"), at(18, "def"), at(36, ""), at(54, "x")];
    assert.deepEqual(logicalLineBoxes(lines, layout), [
      { top: 0, height: 36 },
      { top: 36, height: 18 },
      { top: 54, height: 18 },
    ]);
  });

  it("places a source line the layout never reached below the last one", () => {
    assert.deepEqual(logicalLineBoxes(["a", "b"], [at(0, "a\n")]), [
      { top: 0, height: 18 },
      { top: 18, height: 0 },
    ]);
  });
});
