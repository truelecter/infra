# todowrite2-tasks

Status: disabled in Paseo through `programs.paseo.plugins.todowrite2-tasks.enabled = false` as part of the move from OpenCode to OMP; kept in the repo as an archive. Set it to `true` to turn it back on. The end-to-end suite (`nix run .#paseo-plugins-e2e`) leaves it out: Paseo's mock agent provider can't emit `todowrite2` calls.

Paseo client plugin. It shows the task list of OpenCode 2.x agents that use the `todowrite2` tool:

- an "x/y tasks" pill above the composer, with the full list in its popover;
- a compact "Tasks x/y" row in the timeline in place of each `todowrite2` call. Tap the row to expand the list.

## Why `todowrite2`

OpenCode 2.x has no todo tool. It was removed on purpose; see anomalyco/opencode#42421, closed as not planned. A local OpenCode plugin at `~/.config/opencode/plugins/todo/` adds it back.

Paseo's app treats any tool named `todowrite` as a task list (`packages/app/src/utils/tool-call-parsers.ts`). On OpenCode 2.x, Paseo's handling of it goes wrong in several ways:

- the tool-call row keeps showing "running";
- the built-in pill only updates when the timeline is fetched again, so it goes stale;
- the `in_progress` status is lost.

A plugin cannot hide or feed the built-in pill.

The OpenCode plugin therefore registers the tool as `todowrite2`. Paseo core sees an ordinary tool, so it draws no built-in pill or task cards, and this plugin draws both instead.

## What it does

- **Pill.** For every open OpenCode agent, the plugin registers a hidden composer pill.
  - It follows the agent through the Paseo SDK: `agents.ref(id).timeline.subscribe` for live updates, and `refetch` to page back up to 2000 entries through history when it starts.
  - The latest completed `todowrite2` call is the current list. A running call does not count yet, because it can still fail.
  - The pill appears once a list exists. Cancelled tasks count toward neither number.
- **Timeline row.** A transformer replaces `todowrite2` tool calls:
  - A running call with a readable list, or a completed call, becomes a task row.
  - A running call whose input is not yet readable is hidden.
  - Failed or cancelled calls, or completed calls whose input cannot be read, keep Paseo's own row, so an error stays visible.

Statuses shown: pending, in progress (accent), completed and cancelled (struck through).

Old sessions still contain `todowrite` calls. Paseo keeps handling those as before.

## Develop

Installed through `programs.paseo.plugins.todowrite2-tasks` (the parts/ai/homeModules/paseo.nix Home Manager module). To work on it without a switch, run `paseo-plugin-dev link todowrite2-tasks` from your checkout: Paseo then loads this folder, `paseo plugin reload todowrite2-tasks` picks up each edit, and `paseo plugin logs todowrite2-tasks` shows its output. `paseo-plugin-dev restore todowrite2-tasks` goes back to the installed build. See `parts/ai/AGENTS.md`.

```sh
nix shell --inputs-from "$(git rev-parse --show-toplevel)" latest#bun \
  -c sh -c 'bun install --frozen-lockfile && bun run typecheck && bun run test'
rm -rf node_modules
nix build .#paseo-plugin-todowrite2-tasks -L
```
