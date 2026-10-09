# gsd (OMP extension)

Lazy entry for [gsd-omp](https://github.com/tchivs/gsd-omp), the OMP port of GSD (Get Shit Done). It loads GSD in full inside GSD projects and keeps GSD out of the prompt everywhere else until the first `/gsd-*` command.

## Why

GSD ships 35 agents and 53 skills (after the ignores in `profiles/home/dev/ai.nix`). OMP lists every agent in the `task` tool description and every skill in the system prompt, so each request carried about 5k prompt tokens for GSD (4,965 claude-v5 tokens on a first request with OMP 18.6.1, 4,988 with 18.8.4), also in repositories that don't use it. Settings can't fix that per project: the Home Manager overlay outranks a project's `.omp/config.yml`, and list settings replace instead of merging.

## What it does

- At load, walks up from OMP's working directory to the git root (the first directory with `.git`, or the filesystem root without git) looking for a `.planning/` directory. If there is one, GSD loads as before, nothing hidden.
- Otherwise it sets two runtime-only setting overrides (never written to a config file) through `lookup()` from `@oh-my-pi/pi-coding-agent/config/registry`: `skills.ignoredSkills` becomes the current list plus `gsd-*`, and `task.disabledAgents` the current list plus every GSD agent name, read from the front matter of the package's `agents/` files. It also holds back GSD's `gsd_invoke` tool (an `xd://` device) instead of registering it.
- The real `extension.cjs` from gsd-omp still loads, with a proxied `pi` whose `registerCommand` wraps every handler, so all `/gsd-*` commands (including `/gsd-new-project`, `/gsd-onboard`, `/gsd-map-codebase`) stay registered. Extension commands cost no prompt tokens.
- On the first `/gsd-*` command in a hidden session it clears both overrides, registers `gsd_invoke`, and waits until OMP has rediscovered the skills and rebuilt the prompt before the real handler starts the turn: it polls the active skills (`getActiveSkills()`) until a GSD skill is back and, when the prompt renders skills, the system prompt (`ctx.getSystemPrompt()`) until it mentions GSD skills more often than before. After 15 s it warns and runs the command anyway.
- Subagents: OMP imports the module once and binds its factory to the main session first, then to every subagent session, so the first binding decides for the whole process. Subagent settings are overlays that read through to the main settings live, and a subagent gets the main session's current skills once, at spawn. So a subagent of a hidden session sees no GSD skills or agents, and one spawned after the first `/gsd-*` command (including GSD's own subagents) sees all of them. A subagent that is still running when GSD switches on sees GSD's agents from then on, but not its skills.
- Switching on costs one prompt-cache rewrite. Asking for GSD in plain words, without a slash command, doesn't switch it on. All settings are process-wide, so one OMP process serving several main sessions in different folders (ACP) shares the first session's decision.

## Install

Packaged as `pkgs.omp-extensions.gsd` (flake output `omp-extension-gsd`). The build runs `gsd-omp install --root $out`, removes the generated `extensions/gsd-omp.ts`, and adds `index.ts`, `shared/`, a `gsd-runtime.json` with the paths of `extension.cjs` and the runtime root (the package itself), and a `package.json` pointing OMP at `index.ts`.

```nix
programs.oh-my-pi.extensions = [pkgs.omp-extensions.gsd];
```

## Layout

- `index.ts`: wiring: reads `gsd-runtime.json` and the package's `agents/` and `skills/`, sets and clears the overrides, proxies `pi` for gsd-omp.
- `shared/lazy.ts`: pure logic: `.planning/` lookup, front matter names, list union, the reload check, polling.
- `types/omp.d.ts`: the few OMP declarations used, checked against OMP 18.6.1 and 18.8.4.

## Develop

From this folder, with the Bun of the flake's `latest` input:

```sh
nix shell --inputs-from "$(git rev-parse --show-toplevel)" latest#bun \
  -c sh -c 'bun install --frozen-lockfile && bun run typecheck && bun run test'
rm -rf node_modules
```

`index.ts` only runs from the built package (it needs `gsd-runtime.json`, `agents/`, and `skills/`), so smoke-test with `-e` on the output of `nix build .#omp-extension-gsd`.
