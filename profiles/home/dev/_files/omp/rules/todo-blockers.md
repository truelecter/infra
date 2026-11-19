---
description: Before ending a turn on a blocker, drop or remove the blocked todo items so OMP does not send todo reminders
alwaysApply: true
---

# Todos when blocked

When a turn ends with `pending` or `in_progress` todo items, OMP sends a todo reminder that starts another turn. If the remaining items wait on the user (an approval, an answer, a manual step, a review) or on something outside your reach, there is nothing to do in that turn.

- Before ending a turn on a blocker, `drop` the blocked items (or `rm` them if they no longer apply), in the same response as your last real tool call. Say in the reply what each one waits on.
- Re-add them with `append` when the blocker clears.
- Never end a turn with open items you can still work on: finish them first.
