---
description: Markdown line-wrapping style (no hard wraps mid-sentence); applies when writing or editing Markdown files
condition: ["**/*.{md,mdc}"]
alwaysApply: false
---

# Markdown formatting

Do not hard-wrap prose in Markdown files to a column limit. Write each paragraph, list item, and table row as a single source line; use newlines only to separate paragraphs, list items, headings, and other block elements. Markdown viewers handle the visual wrapping.

- Never break a sentence across source lines just to limit line length.
- Blank line between paragraphs and around headings, lists, tables, code fences.
- Code blocks are untouched by this rule: format code inside fences per the language's own rules (e.g. ruff formats python fences).
- When editing an existing hard-wrapped paragraph, unwrap it into one line as part of the edit.
