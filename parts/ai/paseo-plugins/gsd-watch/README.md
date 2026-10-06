# gsd-watch

Paseo plugin with a live **GSD** panel for each workspace: the phases, plans, lifecycle badges, quick tasks, and archived milestones of the workspace's GSD project, read from its `.planning/` folder. It is a Paseo version of [gsd-watch](https://github.com/sudokku/gsd-watch), the tmux sidebar for Claude Code: while agents run `/gsd-*` commands, the panel shows where the project stands without opening ROADMAP.md or STATE.md.

## Open it

- **`/gsd-watch`** in the composer; nothing is sent to the agent.
- **Command Center** (⌘K on desktop, the sidebar's Search on a phone): **Open GSD project status**.
- **New tab** menu: **GSD**.

On the desktop app and in a browser window 720 px or wider, the first two open the panel in the Explorer next to Files and Changes, so it stays visible beside the chat. The phone and tablet apps, and narrower windows, have a compact Explorer that holds only Files, Changes, and PR, so there the panel opens as a workspace tab; switch between it and the chat with the tab switcher. The 720 px is Paseo's `md` breakpoint, where it switches to the compact layout.

A workspace without `.planning/` shows a note instead.

## What the panel shows

- **Header**: the project name (PROJECT.md's first heading, or the folder name), the milestone, STATE.md's `status` and `stopped_at`, the model profile from `config.json`, a progress bar of completed plans, and the next step GSD suggests in `state.json` with a **Copy** button for its command.
- **Phases**, in number order (decimal phases such as `2.1` after `2`): every folder under `phases/`, plus ROADMAP.md phases that have no folder yet. The current phase has an accent border and starts expanded; tap a phase to expand or collapse it, or use **Expand all** and **Collapse all**.
- **Plans** of an expanded phase: id, title, wave, and status. The current plan (STATE.md's `Plan: N of M` in the current phase) is marked.
- **Badges** per phase, from the files in its folder: Discussed (`NN-CONTEXT.md`), Researched (`NN-RESEARCH.md`), UI spec (`NN-UI-SPEC.md`), Planned (any `NN-MM-PLAN.md`), Executed (any `NN-MM-SUMMARY.md`), Verified (`NN-VERIFICATION.md`), UAT (`NN-UAT.md` or `NN-HUMAN-UAT.md`).
- **Quick tasks** under `quick/`, newest first, and **archived milestones** under `milestones/vX.Y-phases/` with their shipped date from MILESTONES.md; both collapsed until tapped.

## How it reads `.planning/`

The daemon side reads the folder on request; panels poll every 1.5 s while visible, and panels open on the same workspace at the same time share one read. Every file is optional: a missing or malformed one leaves its fields empty.

- A plan is complete when its `SUMMARY.md` exists or ROADMAP.md ticks it (`- [x] 01-02-PLAN.md`); otherwise its front matter `status` decides (`in_progress`, `complete`), and it is pending without one.
- A phase is complete when ROADMAP.md ticks it or all its plans are complete, in progress when it is the current phase or any plan has started, and pending otherwise.
- Plan titles come from ROADMAP.md's plan list (without the `(wave N)` suffix), then the first prose line of the plan's `<objective>`, then the file name.
- Phase names come from ROADMAP.md's `## Phase N: Name` headings, then the folder name.

It differs from the original gsd-watch where GSD's current files differ from what that tool expects: plan progress counts summaries and roadmap ticks (GSD no longer writes `status` into plans), titles skip `<objective>` headings, decimal phase folders are read, and `state.json` supplies the next step.

## Develop

Installed through `programs.paseo.plugins.gsd-watch` (the parts/ai/homeModules/paseo.nix Home Manager module). To work on it without a switch, run `paseo-plugin-dev link gsd-watch` from your checkout: Paseo then loads this folder, `paseo plugin reload gsd-watch` picks up each edit, and `paseo plugin logs gsd-watch` shows its output. `paseo-plugin-dev restore gsd-watch` goes back to the installed build. See `parts/ai/AGENTS.md`.

```sh
nix shell --inputs-from "$(git rev-parse --show-toplevel)" latest#bun \
  -c sh -c 'bun install --frozen-lockfile && bun run typecheck && bun run test'
rm -rf node_modules
nix build .#paseo-plugin-gsd-watch -L
```

The tests read a fixture `.planning/` folder: phase order, status rules, plan titles, badges, quick tasks, milestones, and an empty folder. The end-to-end spec (`_e2e/specs/gsd-watch.spec.ts`) opens the panel from the Command Center on a seeded workspace and checks that it follows a new summary file, then runs `/gsd-watch` in a phone-sized window and checks that the panel opens as a tab. The browser at phone size uses the same compact layout as the phone app; the native apps themselves are not tested.

## Layout

- `index.server.ts`: the RPC handler; checks the folder and shares concurrent reads.
- `index.client.tsx`: registers the panel, the Command Center item, and `/gsd-watch`.
- `shared/gsd.ts`: Zod schemas and the RPC contract.
- `server/planning.ts`: reads and parses `.planning/`.
- `client/gsd-panel.tsx`: the panel.
