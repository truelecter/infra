# catppuccin-mocha

Paseo client plugin. It adds **Catppuccin Mocha** as an app theme under
**Settings → Appearance**.

## Why

Paseo ships Catppuccin only as a syntax-highlighting theme. The app itself (sidebar, panels,
composer, menus, diffs, terminal) has no Catppuccin option.

## What it does

One `client.addTheme` call with a dark palette taken from the
[Catppuccin Mocha](https://catppuccin.com/palette/) colors. Paseo expands those eight colors into
its full token set, so panels, menus, diffs, status colors, and the terminal all follow it.

| Paseo color       | Mocha color | Hex       |
| ----------------- | ----------- | --------- |
| `background`      | base        | `#1e1e2e` |
| `foreground`      | text        | `#cdd6f4` |
| `raised`          | surface0    | `#313244` |
| `control`         | surface1    | `#45475a` |
| `border`          | surface1    | `#45475a` |
| `accent`          | mauve       | `#cba6f7` |
| `mutedForeground` | subtext0    | `#a6adc8` |
| `ring`            | overlay0    | `#6c7086` |

There is no server entry, so no subprocess runs.

## Use

Pick **Catppuccin Mocha** in **Settings → Appearance** on each client. The choice is saved on that
client, not on the daemon. If the plugin is later disabled or removed, Paseo goes back to its
default theme.

## Develop

Installed through `programs.paseo.plugins.catppuccin-mocha` (the parts/ai/homeModules/paseo.nix Home Manager module). To work on it without a switch, run `paseo-plugin-dev link catppuccin-mocha` from your checkout: Paseo then loads this folder, `paseo plugin reload catppuccin-mocha` picks up each edit, and `paseo plugin logs catppuccin-mocha` shows its output. `paseo-plugin-dev restore catppuccin-mocha` goes back to the installed build. See `parts/ai/AGENTS.md`.

```sh
nix shell --inputs-from "$(git rev-parse --show-toplevel)" latest#bun \
  -c sh -c 'bun install --frozen-lockfile && bun run typecheck && bun run test'
rm -rf node_modules
nix build .#paseo-plugin-catppuccin-mocha -L
```

`client/theme.ts` holds the palette and the theme. `client/theme.test.ts` checks that every color
is a hex value from the Mocha palette.
