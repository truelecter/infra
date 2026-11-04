# workspace-title-sync

Server-only Paseo plugin that gives a workspace the title of its agent, as long as that agent is the workspace's only top-level agent. A one-agent workspace then reads like its conversation, and follows it when the agent retitles itself after a topic change (see the `paseo-tools` OMP extension) or is renamed in the UI.

- Counts agents only: subagents (the `paseo.parent-agent-id` label) and archived agents are skipped, terminals are not agents. With a second top-level agent in the workspace, its title stays as it is. A subagent never renames its workspace.
- Syncs on a change of the agent's title, not on every update: a workspace title you set by hand survives until the agent's title changes again.
- Follows renames live: the plugin subscribes to Paseo's agent directory (`paseo.agents.list({ subscribe: {} })`), and each `agent_update` carries the agent with its current title, so the workspace is renamed as soon as the agent is, mid-turn or between turns.
- The directory lives in memory. Its first snapshot after a plugin start or reload is only a baseline and renames nothing; a new agent's first title is a baseline too. After a reconnect, the new snapshot is compared with the directory before it, so a rename missed meanwhile still applies.
- Server setup gets no Paseo client in Paseo 0.15, only hooks do, so the subscription starts at the first agent hook (`agent.create.after`, `agent.turn.before`, `agent.turn.after`) after a start or reload. A rename before then, with no agent created and no turn run, is missed: it becomes the baseline.

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

- `index.server.ts`: starts the agent directory subscription from the first agent hook, reads the rest of a multi-page snapshot, sets the workspace title, releases the subscription on stop.
- `server/title-sync.ts`: pure logic, tested: the only-top-level-agent rule and the directory with its title baseline (`TitleSync`).
