# backlog

Paseo plugin with a **Backlog** screen in the sidebar: a list of things to follow up on, such as an MR that should fix an issue you hit, a bug to look at later, or an idea. Agents add items and check on them through its agent tools (`backlog_add` and friends) or its `backlog` CLI (`cli/backlog`), so a finding doesn't get lost with the chat it came up in, and a later agent can go through the list and report what changed.

## What an item holds

- A numeric id (`#12`) that is never reused, a title, and a Markdown description. Links to MRs, issues, and docs go in the description; the screen renders it and opens links in the browser.
- A status: `open`, `waiting` (on someone else, such as an MR in review), or `done`.
- The Paseo agent whose chat it came from. The agent tools fill this in from the calling agent, the CLI from `$PASEO_AGENT_ID`; the screen shows that agent's current title and opens the chat on press, archived agents included.
- A history: each status change and each log line from a status check, with time and agent.

## The screen

- **Active** (open and waiting), **Done**, and **All** filters, grouped by status, most recently updated first.
- Descriptions start folded behind **Show description**, so long ones don't push other items off screen. Which ones you opened is saved in the backlog file (`openIds`), so they stay open after a reload and on every client of the daemon. Opening or folding one is not an edit: it adds no history and doesn't move the item up the list.
- Add an item with a title and an optional Markdown description; change status with the chips; edit title and description (as Markdown source) with the pencil; delete with the bin (asks first).
- Agents write through the tools and the CLI, which the app isn't told about, so the screen polls every 5 seconds.

The sidebar row is a header item (`addSidebarHeaderItem`), which Paseo lists after the built-in rows. To put it higher, use **Settings → Sidebar** and move it up once; the order is saved per app (desktop, browser, phone).

Descriptions render with Paseo's own `Markdown` component (`@getpaseo/plugin/client/ui`), the renderer chats use: GitHub-flavoured Markdown with tables, task lists, strikethrough, bare URLs, code blocks, and diagrams, in Paseo's chat text style and with its link handling (web links open in the browser).

## How agents reach it

The server side keeps the items in `~/.local/share/paseo-backlog/items.json` (`PASEO_BACKLOG_DIR` overrides the folder). The plugin process is the only writer and runs changes one at a time, so concurrent agents can't lose each other's updates. A file that fails to parse is reported and left alone. Agents reach it two ways:

- Agent tools: `backlog_add`, `backlog_list`, `backlog_show`, `backlog_update`, and `backlog_remove` (`server/agent-tools.ts`), attached to every agent through `server.addHook("agent.open.before")`. They call the store directly, with the socket API's validation, and record the calling agent and its working directory the way the CLI does; `agentId` names another chat instead. Paseo delivers them over its agent tool transport (MCP or native, per provider) under the same gates as Paseo's own tools, and open chats get them when their session reopens: after the plugin starts or reloads, each open session reopens before its next idle prompt.
- The `backlog` CLI, for agents without the tools (a disabled Paseo tool injection, a provider policy that withholds them, a shell outside Paseo). It talks to a small JSON API on the Unix socket `backlog.sock` in the same folder, readable only by your user, with `curl`, so anything that can run a shell command can use it.

The `backlog` skill (`profiles/home/dev/_files/omp/skills/backlog/` for OMP) tells agents when and how to use them, preferring the tools. Keep it, the tools, the CLI, and `server/http.ts` in step.

The socket API:

| Method and path                  | Body                                                | Result                                             |
| -------------------------------- | --------------------------------------------------- | -------------------------------------------------- |
| `GET /items?status=open,waiting` |                                                     | `{ items }`, all statuses when `status` is omitted |
| `GET /items/<id>`                |                                                     | the item                                           |
| `POST /items`                    | `{ title, description?, status?, agentId?, cwd? }`  | the new item, `201`                                |
| `PATCH /items/<id>`              | `{ title?, description?, status?, log?, agentId? }` | the item; `description` replaces the old one       |
| `DELETE /items/<id>`             |                                                     | the deleted item                                   |

Errors come back as `{ error }` with `400` (invalid input, unknown fields included) or `404`.

## The CLI

`cli/backlog` is the command line fallback for agents without the tools; the package exposes it as `pkgs.paseo-plugins.backlog.cli` (a `writeShellApplication` with `curl` and `jq`), and `programs.paseo` puts it on `PATH` whenever the plugin is configured. It needs the plugin running.

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

- `index.server.ts`: RPC handlers for the screen, the agent tools hook, and the socket server for the CLI.
- `index.client.tsx`: registers the screen and its sidebar header item.
- `shared/backlog.ts`: Zod schemas for items and changes, and the RPC contracts.
- `server/store.ts`: pure, tested item logic: ids, status history, ordering.
- `server/file-store.ts`: reads and atomically writes the JSON file, one change at a time.
- `server/http.ts`: the socket API, tested over a real socket.
- `server/agent-tools.ts`: the agent tools, tested against a real file store.
- `client/backlog-screen.tsx`, `client/item-card.tsx`: the screen.
- `cli/backlog`: the CLI over the socket API.
