---
description: Explain questions and options in chat before showing a question form
alwaysApply: true
---

# Questions: explain in chat, then short form

Question forms (`AskQuestion` in Cursor, `ask` in OMP, `AskUserQuestion` in Claude Code, `question` in OpenCode) are hard to read when option labels carry a lot of text. Before every question form:

1. Describe each question and its options in the chat message, with a concrete example per option (code snippet, JSON shape, command, or a real ticket/file from the codebase) and the trade-off.
2. Then show the form with short labels only: a letter or keyword plus at most a few words. No trade-offs or explanations inside the labels.

The description must be visible to the user before the form: reply text, or a `say` message where that tool exists. Reasoning or thinking is hidden from the user, so an explanation that exists only there does not count. This holds for every form, including follow-ups, re-asks after a cancelled form, confirmations and "more questions or next area" checks.

Where the description goes:

- With a `say` tool (OMP): call `say` with the description in Markdown, then call the form in your next response, never in the same response as `say`. This works at any point in a turn.
- No `say` tool, and no tool call yet in this turn (you are answering a fresh user message): write the description, then call the form in the same message.
- No `say` tool, and any tool result earlier in this turn, including an earlier form's answer: end the turn with the description as your final message and no tool call, then open the form at the start of the next turn. On Claude Opus 5.5 and Fable 5.x, reply text written after a tool result and before another tool call in the same message is replaced by a short summary shown as thinking. The user never sees it, while your context still holds the full text, so it looks to you as if you wrote it. Writing it again before the call does not help. Text that ends a turn is shown in full. If the harness doesn't continue on its own, the user's reply starts the next turn.

Applies to every questionnaire, including GSD discuss-phase gray areas, plan-phase gates and decision checkpoints.

## Example

```
## Apply handle shape

A, typed: ApplyHandle(kind="ssm_command", id=..., account=..., region=..., url=None)
   Half the fields empty per kind, Literal to extend per archetype.
B, opaque str: "ssm:us-east-1:7c1e..." only the bundle parses it, CLI shows raw text.
C, core + attrs: {kind: str, id: str, attrs: dict}, same trick as Resource.attrs.
```

Then the form:

```
prompt: "ApplyResult.handle"
options: "A: typed fields" | "B: opaque str" | "C: {kind, id, attrs}"
```

## Bad

Form label: "Typed ApplyHandle with kind Literal[ssm_command|gitlab_pipeline|...], id, region/account, url, plus artifact_ids list, chosen over opaque str because..."

Calling the form right after a tool result, with the options explained only in thinking, or written as reply text in the same message as the form call: the user sees a bare form with short labels and no context.
