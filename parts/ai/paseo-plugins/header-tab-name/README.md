# header-tab-name

Paseo client plugin. It shows the full name of the open tab in the workspace header, after the workspace and project names: `Paseo Home Manager module  infra-new  ›  Research OMP flake.nix build reliability`.

## Why

Tab chips have a fixed width, so agent titles are cut off after a few words, while the header row above them has room to spare. The header only shows the workspace name.

## What it does

- Reads the selected tab of each pane from the tabs row. With split panes, the focused pane's tab wins; if no pane has focus, the first pane's tab is shown.
- Adds the name to the header's title row with a `›` separator, in the title's own font. When space runs out it ends in an ellipsis; hover shows the full name.
- Shows nothing when the tab name only repeats the workspace name (for example a workspace that `workspace-title-sync` named after its only agent), or while the tab's title is still loading.

There is no server entry, so no subprocess runs.

## Limits

- Desktop app and browser only. iOS and Android render natively, and the compact layout already shows the open tab in its tab switcher.
- It depends on Paseo's DOM, checked against Paseo 0.10.2: the `workspace-header-title` and `workspace-tabs-row` test IDs, `aria-selected` on tab chips, and the focused pane's chip being filled with the `surface2` theme color. A Paseo update that changes these can break it; the usual symptom is the name disappearing, and the header then looks as stock.

## Develop

Installed through `programs.paseo.plugins.header-tab-name` (the parts/ai/homeModules/paseo.nix Home Manager module). To work on it without a switch, run `paseo-plugin-dev link header-tab-name` from your checkout: Paseo then loads this folder, `paseo plugin reload header-tab-name` picks up each edit, and `paseo plugin logs header-tab-name` shows its output. `paseo-plugin-dev restore header-tab-name` goes back to the installed build. See `parts/ai/AGENTS.md`.

```sh
nix shell --inputs-from "$(git rev-parse --show-toplevel)" latest#bun \
  -c sh -c 'bun install --frozen-lockfile && bun run typecheck && bun run test'
rm -rf node_modules
nix build .#paseo-plugin-header-tab-name -L
```

`client/web.ts` holds all DOM access; `client/pick.ts` chooses which name to show and is covered by `client/pick.test.ts`. `paseo plugin reload` hot-swaps the plugin in open windows: the old version removes its header nodes and styles before the new one starts.
