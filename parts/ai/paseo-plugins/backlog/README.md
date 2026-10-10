# backlog

Paseo plugin with a **Backlog** screen in the sidebar: a list of things to follow up on, such as an MR that should fix an issue you hit, a bug to look at later, or an idea. Agents add items and check on them through its `backlog` CLI (`cli/backlog`), so a finding doesn't get lost with the chat it came up in, and a later agent can go through the list and report what changed.

## What an item holds

- A numeric id (`#12`) that is never reused, a title, and a Markdown description. Links to MRs, issues, and docs go in the description; the screen renders it and opens links in the browser.
- A status: `open`, `waiting` (on someone else, such as an MR in review), or `done`.
- The Paseo agent whose chat it came from. The CLI fills this in from `$PASEO_AGENT_ID`; the screen shows that agent's current title and opens the chat on press, archived agents included.
- A history: each status change and each `--log` line from a status check, with time and agent.

## The screen

- **Active** (open and waiting), **Done**, and **All** filters, grouped by status, most recently updated first.
- Descriptions start folded behind **Show description**, so long ones don't push other items off screen. Which ones you opened is saved in the backlog file (`openIds`), so they stay open after a reload and on every client of the daemon. Opening or folding one is not an edit: it adds no history and doesn't move the item up the list.
- Add an item with a title and an optional Markdown description; change status with the chips; edit title and description (as Markdown source) with the pencil; delete with the bin (asks first).
- Agents write through the CLI, which the app isn't told about, so the screen polls every 5 seconds.

Paseo adds plugin sidebar items after the built-in ones, so Backlog starts below **Schedules**. To put it above, use **Settings → Sidebar** and move it up once; the order is saved per app (desktop, browser, phone).

Paseo gives plugin UI no Markdown component, and HTML-based renderers don't work in React Native, so `client/markdown.ts` parses the subset agents write (paragraphs with their line breaks, headings, bullet, numbered, and nested task lists, block quotes, fenced code, inline code, bold, italic, strikethrough, `[text](url)`, bare URLs, backslash escapes) and `client/markdown-view.tsx` draws it with `Text` and `View`. Tables, images, and HTML show as plain text.

## How agents reach it

The server side keeps the items in `~/.local/share/paseo-backlog/items.json` (`PASEO_BACKLOG_DIR` overrides the folder) and serves a small JSON API on the Unix socket `backlog.sock` next to it, readable only by your user. The `backlog` CLI talks to that socket with `curl`, so any agent that can run a shell command can use it, in any harness and without a restart. The plugin process is the only writer and runs changes one at a time, so concurrent agents can't lose each other's updates. A file that fails to parse is reported and left alone.

The `backlog` skill (`profiles/home/dev/_files/omp/skills/backlog/` for OMP) tells agents when and how to use the CLI. Keep it, the CLI, and `server/http.ts` in step.

Plugin RPC and an injected MCP server were the other options. Paseo has no CLI for plugin RPC, and an MCP server added through `server.before("agent.create")` reaches only agents created after the plugin, not the chats already open.

| Method and path                  | Body                                                | Result                                             |
| -------------------------------- | --------------------------------------------------- | -------------------------------------------------- |
| `GET /items?status=open,waiting` |                                                     | `{ items }`, all statuses when `status` is omitted |
| `GET /items/<id>`                |                                                     | the item                                           |
| `POST /items`                    | `{ title, description?, status?, agentId?, cwd? }`  | the new item, `201`                                |
| `PATCH /items/<id>`              | `{ title?, description?, status?, log?, agentId? }` | the item; `description` replaces the old one       |
| `DELETE /items/<id>`             |                                                     | the deleted item                                   |

Errors come back as `{ error }` with `400` (invalid input, unknown fields included) or `404`.

## The CLI

`cli/backlog` is the command line agents use; the package exposes it as `pkgs.paseo-plugins.backlog.cli` (a `writeShellApplication` with `curl` and `jq`), and `programs.paseo` puts it on `PATH` whenever the plugin is configured. It needs the plugin running.

```sh
backlog add "MR !123 fixes the login loop" --status waiting \
  --description "[!123](https://gitlab.example.com/group/project/-/merge_requests/123) fixes it. Drop the workaround once merged."
backlog add "Longer one" --description - <<'EOF'    # Markdown from standard input
- [ ] step one
- [ ] step two
EOF
backlog list                    # open and waiting items; --all, --status done, --json
backlog show 1                  # full history
backlog update 1 --log "Still in review"
backlog update 1 --status done --log "Merged, deployed"
backlog update 1 --title T --description "replaces the old description"
backlog rm 1
```

- The description is Markdown; Paseo renders it and opens its links. `--description -` reads it from standard input, which avoids shell quoting for multi-line text.
- `add` records the Paseo agent running the command (`$PASEO_AGENT_ID`) as the item's source chat, and `update` records it on the history entry. `--agent <id>` names another agent.
- `add` also records the working directory (`$PASEO_AGENT_CWD`, else `$PWD`).
- `--json` prints the plugin's JSON instead of the text view.
- Errors from the plugin (unknown id, invalid status, unknown field) are printed as `backlog: <message>` with exit code 1.
- `PASEO_BACKLOG_DIR` points it at another plugin data folder; it must match the plugin's.
- While developing, run `cli/backlog` straight from the checkout; it is plain Bash and uses `curl` and `jq` from `PATH`.

## Develop

Installed through `programs.paseo.plugins.backlog` (the parts/ai/homeModules/paseo.nix Home Manager module). To work on it without a switch, run `paseo-plugin-dev link backlog` from your checkout: Paseo then loads this folder, `paseo plugin reload backlog` picks up each edit, and `paseo plugin logs backlog` shows its output. `paseo-plugin-dev restore backlog` goes back to the installed build. See `parts/ai/AGENTS.md`.

```sh
nix shell --inputs-from "$(git rev-parse --show-toplevel)" latest#bun \
  -c sh -c 'bun install --frozen-lockfile && bun run typecheck && bun run test'
rm -rf node_modules
nix build .#paseo-plugin-backlog .#paseo-plugin-backlog.cli -L
```

The log shows `[backlog] Listening on <socket>, items in <file>` after each start.

## Layout

- `index.server.ts`: RPC handlers for the screen, and the socket server for the CLI.
- `index.client.tsx`: registers the screen and the sidebar item.
- `shared/backlog.ts`: Zod schemas for items and changes, and the RPC contracts.
- `server/store.ts`: pure, tested item logic: ids, status history, ordering.
- `server/file-store.ts`: reads and atomically writes the JSON file, one change at a time.
- `server/http.ts`: the socket API, tested over a real socket.
- `client/backlog-screen.tsx`, `client/item-card.tsx`: the screen.
- `client/markdown.ts` (tested), `client/markdown-view.tsx`: description parsing and rendering.
- `cli/backlog`: the CLI over the socket API.
