---
name: backlog
description: Keep follow-ups in the user's Paseo backlog with the `backlog_*` tools or the `backlog` CLI. Use when the user asks to put something in the backlog or TODO list, to remember or track something for later (an MR or PR that should fix an issue, a bug, an idea), or to check, review, update, or close backlog items.
---

# Paseo backlog

The backlog is a list of things to follow up on, shown in Paseo's sidebar under **Backlog**. Agents write to it; the user reads and edits it in the app. Each item has a numeric id (`#12`), a title, a Markdown description, a status, the Paseo agent whose chat it came from, and a history of checks.

Statuses: `open` (to do), `waiting` (blocked on someone else, such as an MR in review), `done`.

## Tools first, CLI as fallback

Inside Paseo, the backlog plugin gives every agent these tools (they may sit in a tool catalog such as `xd://` instead of the main tool list):

| Tool             | Does                                                                              |
| ---------------- | --------------------------------------------------------------------------------- |
| `backlog_add`    | `{ title, description?, status?, agentId? }`: add an item                         |
| `backlog_list`   | `{ status? }`: items in status order; open and waiting unless given statuses      |
| `backlog_show`   | `{ id }`: one item with its full history, description verbatim                    |
| `backlog_update` | `{ id, title?, description?, status?, log?, agentId? }`: change and/or log a line |
| `backlog_remove` | `{ id }`: delete an item                                                          |

Use them when you have them. Without them (outside Paseo, or a chat opened before the plugin and not reopened yet), use the `backlog` CLI, which does the same over the plugin's socket; `backlog help` prints its usage. Both record the current Paseo agent as the source chat (the CLI from `$PASEO_AGENT_ID`) and your working directory, so the user can jump back to this chat from the app. Pass `agentId` (CLI: `--agent <id>`) only to name another chat.

## Add an item

Write it so that someone who never saw this chat can act on it: what the problem is, what should fix it, and how to tell it is fixed. The description is Markdown, rendered in the app the way Paseo renders chat messages: put links to MRs, issues, and docs in it as `[text](url)` or full URLs, and use task lists for the steps left.

```json
{
  "title": "MR !123 fixes the login redirect loop",
  "status": "waiting",
  "description": "Login loops after SSO on staging. [!123](https://gitlab.example.com/group/project/-/merge_requests/123) fixes it.\n\n- [ ] !123 merged and deployed\n- [ ] drop the redirect workaround in `auth.ts`"
}
```

With the CLI, pass the description on standard input with `--description -` to avoid shell quoting:

```sh
backlog add "MR !123 fixes the login redirect loop" --status waiting --description - <<'EOF'
Login loops after SSO on staging. [!123](https://gitlab.example.com/group/project/-/merge_requests/123) fixes it.

- [ ] !123 merged and deployed
- [ ] drop the redirect workaround in `auth.ts`
EOF
```

Report the new item's id to the user.

## Check items

List with `backlog_list` (all statuses: `{"status": ["open", "waiting", "done"]}`) and read one in full with `backlog_show`. CLI: `backlog list`, `backlog list --all --json`, `backlog show 12`.

To check status, follow the links in each item's description with the tools you have (for example `glab mr view`, `gh pr view`, the Jira tools), then record what you found. Every check gets a log line, even when nothing changed, so the history shows when it was last looked at:

```text
{ "id": 12, "log": "Still in review, 2 approvals of 3" }
{ "id": 12, "status": "done", "log": "Merged 2026-10-01, deployed to prod" }
```

CLI: `backlog update 12 --log "..."`, `backlog update 12 --status done --log "..."`.

Finish with a short summary per item: id, title, old and new status, and what you found.

## Edit and remove

`backlog_update` with `title` renames; with `description` it replaces the whole description, so start from the current one (`backlog_show` prints it verbatim after `description:`). CLI: `backlog update 12 --title "New title"`, `backlog show 12 --json | jq -r .description`, `backlog update 12 --description - <<'EOF'`.

Keep the description current when facts change (a new MR replaces the old one, a task-list step is done); history lines are for checks.

Only remove items (`backlog_remove`, CLI `backlog rm 12`) when the user asks; mark finished work `done` instead.

## Errors

A tool error or the CLI's `backlog: <message>` (unknown id, invalid status, nothing to change) names the problem; fix the input. `cannot reach the backlog plugin` from the CLI means the Paseo `backlog` plugin is not running. Tell the user; don't write the data file yourself.
