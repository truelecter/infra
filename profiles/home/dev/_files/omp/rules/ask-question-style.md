---
description: Explain questions and options in chat before showing a question form
alwaysApply: true
---

# Questions: explain first, then a short form

Before every `ask` form, including follow-ups, re-asks, confirmations, and GSD gray areas and checkpoints:

1. Call `say` with each question and its options in Markdown: a concrete example per option (code snippet, JSON shape, command, or a real ticket or file) and the trade-off.
2. In your next response, never the same one as `say`, call `ask` with short labels only: a letter or keyword plus a few words, no trade-offs.

Text in thinking, or reply text written after a tool result in the same message as the form, is not shown to the user (Opus 5.5 and Fable 5.x replace it with a summary), so it doesn't count as the explanation.

Example `say` text, then labels `"A: typed fields" | "B: opaque str" | "C: {kind, id, attrs}"`:

```
A, typed: ApplyHandle(kind="ssm_command", id=..., region=...): half the fields empty per kind.
B, opaque str: "ssm:us-east-1:7c1e...": only the bundle parses it, CLI shows raw text.
C, core + attrs: {kind, id, attrs: dict}: same trick as Resource.attrs.
```
