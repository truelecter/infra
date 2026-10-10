import { test } from "node:test";
import assert from "node:assert/strict";
import { parseInline, parseMarkdown } from "./markdown.ts";

test("links, bare URLs, and emphasis nest; snake_case and escapes stay literal", () => {
  assert.deepEqual(
    parseInline("**See [!42](https://git/x/42)** or https://git/x/43."),
    [
      {
        type: "strong",
        children: [
          { type: "text", text: "See " },
          {
            type: "link",
            href: "https://git/x/42",
            children: [{ type: "text", text: "!42" }],
          },
        ],
      },
      { type: "text", text: " or " },
      {
        type: "link",
        href: "https://git/x/43",
        children: [{ type: "text", text: "https://git/x/43" }],
      },
      { type: "text", text: "." },
    ],
  );
  assert.deepEqual(parseInline("set my_var_name, \\*not em\\*"), [
    { type: "text", text: "set my_var_name, *not em*" },
  ]);
});

test("inline code keeps markup inside it", () => {
  assert.deepEqual(parseInline("run `a **b** [c](d)` now"), [
    { type: "text", text: "run " },
    { type: "code", text: "a **b** [c](d)" },
    { type: "text", text: " now" },
  ]);
});

test("fenced code is kept verbatim, including blank lines and markup", () => {
  assert.deepEqual(
    parseMarkdown("```sh\ngh pr view 1\n\n# not a heading\n```\nafter"),
    [
      { type: "code", lang: "sh", text: "gh pr view 1\n\n# not a heading" },
      { type: "paragraph", children: [{ type: "text", text: "after" }] },
    ],
  );
});

test("nested task lists split by indentation, and blank lines between items keep one list", () => {
  const [list] = parseMarkdown(
    "- [x] merged\n- [ ] deployed\n  - staging\n  - prod\n\n- cleanup",
  );
  assert.equal(list.type, "list");
  if (list.type !== "list") return;
  assert.deepEqual(
    list.items.map((item) => item.checked),
    [true, false, undefined],
  );
  const nested = list.items[1].children[1];
  assert.equal(nested.type, "list");
  if (nested.type === "list") assert.equal(nested.items.length, 2);
});

test("numbered lists keep their start, and a text line after a blank ends the list", () => {
  const blocks = parseMarkdown("3. third\n4. fourth\n\nDone.");
  assert.deepEqual(
    blocks.map((block) => block.type),
    ["list", "paragraph"],
  );
  assert.equal(blocks[0].type === "list" && blocks[0].start, 3);
});

test("paragraph line breaks are kept; rules, headings, and quotes end a paragraph", () => {
  assert.deepEqual(
    parseMarkdown("one\ntwo\n---\n## Status\n> quoted").map(
      (block) => block.type,
    ),
    ["paragraph", "rule", "heading", "quote"],
  );
  assert.deepEqual(parseMarkdown("one\ntwo")[0], {
    type: "paragraph",
    children: [{ type: "text", text: "one\ntwo" }],
  });
});
