# project-groups

Paseo client plugin. It nests the sidebar's projects into collapsible groups, as many levels deep as you like. Example: `shepherd-companion` holding its `app` and `cdk` projects, so one click collapses both.

## Why

Paseo's sidebar is a flat list of projects, each with its workspaces. A project has exactly one root folder, so a codebase split across folders or repos (code in `app/`, infrastructure in `cdk/`) becomes several projects that collapse one by one. Paseo has no groups, folders, or nesting, and its plugin API cannot add rows to the project list (checked against Paseo 0.10.1).

## Using it

A project's group comes from, in order:

1. **The folder button.** Hover a project row and press the folder-arrow button next to `+` and `⋯`. Type a group, or pick an existing one, and press Enter. Use `/` to nest: `work/aws`. **Remove** takes the project out of its group.
2. **Its name.** A project whose name contains `/` is grouped by everything before the last `/`. Rename a project to `shepherd-companion/app` (project `⋯` → settings) and it shows as `app` under `shepherd-companion`. This works without the plugin's storage and keeps the projects next to each other even where the plugin is not running.

Group header rows:

- Click to collapse or expand. When collapsed they show how many projects are inside, and a status dot for the most urgent state among them (needs input, failed, running, attention).
- Hover for **Rename** (pencil) and **Ungroup**. Renaming also moves subgroups. Ungroup removes one level: projects move to the parent group, or out of groups entirely at the top level. Both also apply to projects grouped only by their name.

A group appears where its first project would be in Paseo's order, and its other projects move up behind it. Dragging projects still reorders them the Paseo way. A group has no order of its own.

## Where things are stored

| What               | Where                                                                         | Shared                                             |
| ------------------ | ----------------------------------------------------------------------------- | -------------------------------------------------- |
| Button assignments | Daemon plugin settings, `~/.paseo/plugin-settings/project-groups/groups.json` | All clients of that daemon                         |
| Collapsed groups   | Browser storage, `paseo-plugin:project-groups:collapsed`                      | This window only (like Paseo's own collapse state) |

An assignment is keyed by the project's sidebar key and holds a group path. An empty path keeps a `/`-named project out of the group its name implies. Other windows pick up changes when they get focus.

## How it works

The plugin API cannot add rows to the project list, so on desktop and web `client/web.ts` edits the rendered page:

- It finds project rows by `data-testid="sidebar-project-row-<key>"`, then walks up to the dnd-kit sortable item and the project list container (a flex column).
- It inserts its own header elements into that container. React only moves and removes its own nodes, so extra siblings are safe.
- It sets CSS `order` on each project item so groups read top to bottom without moving React's nodes. A data attribute hides collapsed projects and another one indents them.
- It adds the folder button to each row's trailing actions. The button swallows pointer, mouse, touch, click, context-menu and key events, so the row does not also collapse, drag, or open its menu.
- For `/`-named projects it rewrites the title text node to the last segment. It only touches text Paseo wrote or that it wrote itself.
- Colors come from the CSS variables Unistyles writes for the active theme (`--colors-foreground-muted`, `--colors-surface-sidebar-hover`, ...), so theme switches carry over without extra work.
- A `MutationObserver` re-applies everything when the sidebar changes. It ignores changes elsewhere on the page, such as streaming agent output. Every write is skipped when the page already has the value, so each change settles after one pass.

`client/groups.ts` holds the grouping model (placement, layout, rename/ungroup rewrites) as pure functions. `client/sync.ts` holds the settings sync: changes show at once, then save with the last known revision, and are reapplied and retried on a conflict. Both have tests.

## Limits

- Desktop app and browser only. iOS and Android render natively, so the plugin does nothing there and projects show flat. `/` names still keep them together.
- It depends on Paseo's sidebar DOM: row test IDs, the row → block → sortable → container nesting, and the trailing-actions position. A Paseo update that changes these can break it. The usual symptom is groups disappearing, and the sidebar then works as stock.
- While dragging a project, dnd-kit animates in Paseo's order, not the grouped order, so neighbours can shift oddly mid-drag. The drop result is right.
- ⌘1–9 workspace shortcuts follow Paseo's order and still count workspaces in collapsed groups.
- Screen readers read group headers after the projects, because `order` changes only the visual order.

## Develop

Installed through `programs.paseo.plugins.project-groups` (the parts/ai/homeModules/paseo.nix Home Manager module). To work on it without a switch, run `paseo-plugin-dev link project-groups` from your checkout: Paseo then loads this folder, `paseo plugin reload project-groups` picks up each edit, and `paseo plugin logs project-groups` shows its output. `paseo-plugin-dev restore project-groups` goes back to the installed build. See `parts/ai/AGENTS.md`.

```sh
nix shell --inputs-from "$(git rev-parse --show-toplevel)" latest#bun \
  -c sh -c 'bun install --frozen-lockfile && bun run typecheck && bun run test'
rm -rf node_modules
nix build .#paseo-plugin-project-groups -L
```

`paseo plugin reload` hot-swaps the plugin in open windows: the old version cleans up its headers, buttons and styles before the new one starts.

To check DOM changes without touching the desktop window, serve the desktop app's web bundle (`Paseo.app/Contents/Resources/app-dist`) from a small local server. That server also proxies HTTP and WebSocket requests to the daemon and strips the `Origin` header, which the daemon would otherwise reject. Open the server in a Paseo browser tab, add a direct connection to it, and inspect the sidebar with `browser_evaluate`. Plugins load there as they do in the app.
