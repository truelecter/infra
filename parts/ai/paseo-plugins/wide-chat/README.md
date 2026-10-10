# wide-chat

Paseo client plugin. It lets the chat column (the timeline, the composer, the tasks/subagents
track, and the new-agent form) use more of the agent pane on desktop and in the browser.

## Why

Paseo limits every chat-column container to its content width, 820 px by default (`DEFAULT_CONTENT_MAX_WIDTH` in `packages/app/src/styles/theme.ts`). In a 1350 px pane that is about 60% of the width.

Paseo 0.11 added its own fixed width for this (Settings → Appearance → Content width, 600 to 4000 px). The plugin finds Paseo's rules by their `820px` value, so it only works while that setting is left at the default; with a custom width it does nothing. What it adds over the setting is a width that is a share of the pane rather than a fixed number of pixels.

## What it does

Paseo generates its CSS while it runs. Unistyles writes rules with hashed class names into
`<style id="unistyles-web">`, and React Native Web adds atomic rules as components first
render. The plugin:

1. Scans every stylesheet for rules with `max-width: 820px` and records their selectors.
2. Writes its own `<style data-paseo-plugin="wide-chat">` that raises those selectors to
   `max(820px, min(<width>%, <maximum>px))` with `!important`. A capped container nested inside
   another one (the composer inside the new-agent form) fills its parent instead of shrinking
   again.
3. Rescans after DOM changes, but only when a stylesheet was replaced or gained rules, so
   streaming output costs next to nothing. This runs before paint, so new views do not flash
   at the narrow width.

The column is never narrower than stock, so narrow panes and splits look the same as without
the plugin.

It only runs where the app renders to the DOM (the desktop app and the browser). On iOS and
Android it does nothing; phones are narrower than 820 px anyway.

## Settings

**Settings → Plugins → wide-chat → Chat width**, or **Chat width settings** in the Command Center
(⌘K):

| Setting       | Default         | Choices      |
| ------------- | --------------- | ------------ |
| Width         | 90% of the pane | 70–100%      |
| Maximum width | No limit        | 1000–2560 px |

Settings are stored on the daemon (host scope), so every client of that daemon shares them.
The window that changes a setting applies it at once. Other windows pick it up when they get
focus.

## Limits

- It depends on Paseo's 820 px value. If Paseo changes it, update `STOCK_MAX_WIDTH` in
  `client/css.ts`.
- Paseo estimates message heights for its virtualized list from 820 px. Wider rows are shorter
  than estimated, so the first scroll through a long history can shift a little while real
  heights replace the estimates.

## Develop

Installed through `programs.paseo.plugins.wide-chat` (the parts/ai/homeModules/paseo.nix Home Manager module). To work on it without a switch, run `paseo-plugin-dev link wide-chat` from your checkout: Paseo then loads this folder, `paseo plugin reload wide-chat` picks up each edit, and `paseo plugin logs wide-chat` shows its output. `paseo-plugin-dev restore wide-chat` goes back to the installed build. See `parts/ai/AGENTS.md`.

```sh
nix shell --inputs-from "$(git rev-parse --show-toplevel)" latest#bun \
  -c sh -c 'bun install --frozen-lockfile && bun run typecheck && bun run test'
rm -rf node_modules
nix build .#paseo-plugin-wide-chat -L
```

`client/css.ts` holds the selector scan and CSS generation as pure functions with tests.
`client/web.ts` holds everything that touches the DOM.
