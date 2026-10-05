# workspace-title-sync

Server-only Paseo plugin that gives a workspace the title of its agent, as long as that agent is the workspace's only top-level agent. A one-agent workspace then reads like its conversation, and follows it when the agent retitles itself after a topic change (see `omp/paseo-agent-id`) or is renamed in the UI.

- Counts agents only: subagents (the `paseo.parent-agent-id` label) and archived agents are skipped, terminals are not agents. With a second top-level agent in the workspace, its title stays as it is. A subagent never renames its workspace.
- Syncs on a change of the agent's title, not on every turn: a workspace title you set by hand survives until the agent's title changes again.
- Paseo has no "agent renamed" event, so the plugin compares titles at turn boundaries: `agent.turn_started` records the agent's title as a baseline, `agent.turn_ended` compares against the last title seen and renames the workspace when it changed. A retitle during a turn shows up when the turn ends; a rename between turns shows up at the end of the next one.
- Titles come from `paseo.agents.list`, not the hook event: the event's `agent.title` is the title the agent was created with (Paseo 0.10.1 updates only the stored record on rename).
- Baselines live in memory. After a plugin reload or daemon restart, an agent's first turn sets the baseline without renaming anything.

## Develop

Installed through `programs.paseo.plugins.workspace-title-sync` (the parts/ai/homeModules/paseo.nix Home Manager module). To work on it without a switch, run `paseo-plugin-dev link workspace-title-sync` from your checkout: Paseo then loads this folder, `paseo plugin reload workspace-title-sync` picks up each edit, and `paseo plugin logs workspace-title-sync` shows its output. `paseo-plugin-dev restore workspace-title-sync` goes back to the installed build. See `parts/ai/AGENTS.md`.

```sh
nix shell --inputs-from "$(git rev-parse --show-toplevel)" latest#bun \
  -c sh -c 'bun install --frozen-lockfile && bun run typecheck && bun run test'
rm -rf node_modules
nix build .#paseo-plugin-workspace-title-sync -L
```

Requires `pluginsEnabled: true` in the daemon's `config.json`. Each rename is logged as `Workspace <id> renamed after agent <id>: <title>`.

## Layout

- `index.server.ts`: registers the lifecycle hooks, lists agents through the plugin's Paseo SDK connection, sets the workspace title.
- `server/title-sync.ts`: pure logic, tested: the only-top-level-agent rule and the per-agent title baseline.
