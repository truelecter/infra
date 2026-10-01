---
name: backlog
description: Keep follow-ups in the user's Paseo backlog with the `backlog` CLI. Use when the user asks to put something in the backlog or TODO list, to remember or track something for later (an MR or PR that should fix an issue, a bug, an idea), or to check, review, update, or close backlog items.
---

# Paseo backlog

The backlog is a list of things to follow up on, shown in Paseo's sidebar under **Backlog**. Agents write to it with the `backlog` CLI; the user reads and edits it in the app. Each item has a numeric id (`#12`), a title, a Markdown description, a status, the Paseo agent whose chat it came from, and a history of checks.

Statuses: `open` (to do), `waiting` (blocked on someone else, such as an MR in review), `done`.

## Add an item

Write it so that someone who never saw this chat can act on it: what the problem is, what should fix it, and how to tell it is fixed. The description is Markdown, rendered in the app: put links to MRs, issues, and docs in it as `[text](url)` or full URLs, and use task lists for the steps left. Pass it on standard input with `--description -` to avoid shell quoting:

```sh
backlog add "MR !123 fixes the login redirect loop" --status waiting --description - <<'EOF'
Login loops after SSO on staging. [!123](https://gitlab.example.com/group/project/-/merge_requests/123) fixes it.

- [ ] !123 merged and deployed
- [ ] drop the redirect workaround in `auth.ts`
EOF
```

- The item records the current Paseo agent (`$PASEO_AGENT_ID`) as its source, so the user can jump back to this chat from the app. Pass `--agent <id>` to name another chat instead.
- Supported Markdown: paragraphs, headings, bullet, numbered, and task lists, block quotes, fenced code, `code`, bold, italic, strikethrough, links. No tables, images, or HTML.
- Report the new item's id to the user.

## Check items

```sh
backlog list                 # open and waiting items
backlog list --all --json    # everything, as JSON
backlog show 12              # one item with its full history
```

To check status, follow the links in each item's description with the tools you have (for example `glab mr view`, `gh pr view`, the Jira tools), then record what you found. Every check gets a `--log` line, even when nothing changed, so the history shows when it was last looked at:

```sh
backlog update 12 --log "Still in review, 2 approvals of 3"
backlog update 12 --status done --log "Merged 2026-10-01, deployed to prod"
```

Finish with a short summary per item: id, title, old and new status, and what you found.

## Edit and remove

```sh
backlog update 12 --title "New title"
backlog show 12 --json | jq -r .description    # current description, to edit
backlog update 12 --description - <<'EOF'     # replaces the whole description
...
EOF
backlog rm 12
```

Keep the description current when facts change (a new MR replaces the old one, a task-list step is done); history lines are for checks.

Only remove items when the user asks; mark finished work `done` instead.

## Errors

`cannot reach the backlog plugin` means the Paseo `backlog` plugin is not running. Tell the user; don't write the data file yourself.
