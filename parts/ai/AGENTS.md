# AGENTS.md: AI agent tooling (`parts/ai`)

How to change and test the oh-my-pi (`omp`) Home Manager module, the OMP extensions, the GSD package, and the Paseo module and plugins in this folder. Read it before touching anything under `parts/ai/` or the OMP settings in `profiles/home/dev/ai.nix`.

## Layout

```text
parts/ai/
  default.nix                 flake-parts module: packages, overlays.ai, homeModules.oh-my-pi, homeModules.paseo, homeModules.searxng
  homeModules/oh-my-pi.nix    the programs.oh-my-pi Home Manager module
  homeModules/paseo.nix       the programs.paseo Home Manager module (~/.paseo/config.json and plugins)
  homeModules/paseo-sync.sh   its activation step: merges config.json, applies plugin changes to a running daemon
  homeModules/paseo-plugin-dev.sh  `paseo-plugin-dev`: points a plugin link at a checkout or back, without a switch
  homeModules/searxng.nix     the services.searxng Home Manager module (local SearXNG user service)
  omp-extensions/
    default.nix               builds every <name>/ folder, plus `gsd` from packages/gsd-omp
    <name>/                   one OMP extension per folder
  paseo-plugins/
    default.nix               builds every <id>/ folder; requirements.paseo check, node_modules hashes
    semver.nix                the range check used for requirements.paseo
    node-modules.nix          fixed-output `bun install` used for plugin dependencies and test deps
    _test-deps/               zod, react, and the plugin SDK, locked, for the plugins' tests
    _e2e/                     end-to-end suite: harness, Playwright specs per plugin (paseo-plugins-e2e)
    <id>/                     one Paseo plugin per folder
  packages/gsd-omp/           the gsd-omp CLI (buildNpmPackage), see its README for updates
profiles/home/dev/ai.nix      the shared profile: OMP extension list and provider-neutral settings, programs.paseo settings and plugins
profiles/home/dev/_files/omp/ rules, skills, and subagents linked into ~/.omp/agent
home/users/<os>/<user>.nix    per-user choices: OMP model roles and models.yml, Paseo's title-generation model, machine-bound Paseo plugins (vpn)
```

Outputs, all from `default.nix`:

| Output | What it is |
| --- | --- |
| `packages.<system>.omp-extension-<name>` | one per folder in `omp-extensions/`, plus `omp-extension-gsd` |
| `packages.<system>.paseo-plugin-<id>` | one per folder in `paseo-plugins/` (not `_`-prefixed ones) |
| `packages.<system>.paseo-plugins-e2e` | the plugins' end-to-end suite on every system, `nix run .#paseo-plugins-e2e` (see "End-to-end tests") |
| `packages.<system>.gsd-omp` | the gsd-omp CLI |
| `overlays.ai` | `pkgs.omp-extensions.<name>`, `pkgs.paseo-plugins.<id>`, and `pkgs.gsd-omp`; the darwin and NixOS configurations apply it |
| `homeModules.oh-my-pi` | `programs.oh-my-pi`; also shared into every Home Manager user |
| `homeModules.paseo` | `programs.paseo`; also shared into every Home Manager user |
| `homeModules.searxng` | `services.searxng`; also shared into every Home Manager user |

Provider choices belong to the user, not the shared profile: `profiles/home/dev/ai.nix` routes agents to role names (`task.agentModelOverrides`, `@gsd-deep`, ...), and each user's file under `home/users/` maps those roles to models (`programs.oh-my-pi.settings.modelRoles`, `retry.fallbackChains`, `models`). Unset roles resolve to no model, and OMP falls back to the session model. This repository is public: keep secrets and internal endpoints (credentials, MCP servers on internal hosts) out of it. The module loads such settings from a later overlay through `extraConfigFiles` or an `OMP_CONFIG_FILES` line in `~/.omp/agent/.env`, kept outside this repository; secrets themselves go in `~/.omp/agent/.env`.

## How OMP reads what the module writes

Knowing this avoids most surprises. Versions refer to omp 18.3.2; recheck after upgrades.

- Settings layers, lowest to highest: schema defaults, `~/.omp/agent/config.yml` (OMP's own, written by `/settings`, `/model`, `omp config set`), project `.omp/config.yml`, overlays from `PI_CONFIG_FILES` (from `OMP_CONFIG_FILES` in a `.env`) in order, runtime overrides. Maps deep-merge, lists replace. The higher layer's `extensions:` list replaces lower ones entirely.
- `mutableSettings = true` (default) writes `settings` to the overlay `~/.omp/agent/nix-config.yml`. `false` makes `~/.omp/agent/config.yml` itself a read-only link; OMP's saves then fail on a lock next to the store file, the change lasts until OMP exits, and the `nix-settings-notice` extension reports it.
- Every overlay file must exist and parse as a YAML mapping, or OMP refuses to start. Relative overlay paths resolve against OMP's working directory, so use `~/...` or absolute paths.
- `.env` files: the first one to set a key wins, in this order: exported environment, project `.env`, `~/.omp/agent/.env`, `~/.omp/.env` (written by the module). `OMP_*` keys are copied to `PI_*` only when they come from a `.env` file; exported variables must use the `PI_*` name.
- A configured extension directory is an extension package: OMP loads the entry points in its `package.json` `omp.extensions` and also discovers its `agents/`, `skills/`, `rules/`, `commands/`, `prompts/`, `hooks/`, `tools/`, and `.mcp.json`. That is how `omp-extension-gsd` ships GSD's agents and skills from the store.
- Discovery follows Home Manager symlinks for rules, skills, agents, commands, prompts, tools, and extensions, but OMP's native hook loader skips symlinked files. The module therefore copies hooks into one store directory and links the directory.
- `mcp.json` stays unmanaged (OMP's `/mcp` writes it); the module writes `.mcp.json` next to it. On a name clash the `mcp.json` server wins.
- `omp` in the Paseo daemon's shell is not on `PATH`; use `/etc/profiles/per-user/$(id -un)/bin/omp`.

## Extension anatomy

Copy an existing folder (`caveman` is the fullest example) and keep this shape:

- `package.json`: `"name": "omp-<name>"`, a `version`, `"omp": { "extensions": ["./index.ts"] }`, scripts `typecheck` (`tsc --noEmit`) and `test` (`bun test shared/*.test.ts`), and only `@types/node` and `typescript` as dev dependencies. The version ends up in the store path name; bump it when behavior changes.
- `index.ts`: `export default function <name>(pi: ExtensionAPI): void`. Wiring only: event handlers, commands, reading the environment. Imports use explicit `.ts` extensions.
- `shared/*.ts`: the logic, as pure functions, with tests next to it as `shared/*.test.ts` (`node:test`, `node:assert/strict`). Prefer `node:` modules over Bun globals in `shared/` so the types stay simple.
- `types/omp.d.ts`: minimal ambient declarations for the `@oh-my-pi/*` modules you import. OMP provides these modules at runtime; never install them. Declare only what you use, and check every declaration against the OMP source at the tag matching `omp --version` (`packages/coding-agent/src/extensibility/extensions/types.ts`, `config/settings.ts`, `config/registry.ts`). Useful entry points: `pi.on(event, handler)`, `pi.registerCommand`, `pi.sendMessage`, `pi.getActiveTools`/`setActiveTools`, `pi.pi.settings` (the process-wide `Settings`), `ctx.ui.notify`.
- `README.md`: what it does and why, install (`programs.oh-my-pi.extensions = [pkgs.omp-extensions.<name>];`), layout, develop. One source line per paragraph, no hard wraps.
- `bun.lock`: from `bun install`; its workspace `name` must match `package.json`.

The build (`omp-extensions/default.nix`) copies only `index.ts`, `package.json`, `README.md`, and `shared/` (minus tests) into the store. A new runtime file or folder must be added to its `installPhase`. Tests run in the build's `checkPhase` (`bun test ./shared`), so a failing test fails the package and the system build.

## Change an extension

1. Edit the folder. New, untracked files are invisible to the flake until `git add -N <path>`.
2. Type check and unit test from the extension folder, with the Bun of the `latest` input (the `bun.lock` format needs a recent Bun, which the registry's `nixpkgs#bun` may not be):

   ```sh
   nix shell --inputs-from "$(git rev-parse --show-toplevel)" latest#bun \
     -c sh -c 'bun install --frozen-lockfile && bun run typecheck && bun run test'
   rm -rf node_modules
   ```

3. Build the package, which runs the tests again in the sandbox:

   ```sh
   nix build .#omp-extension-<name> -L --print-out-paths
   ```

4. Smoke-test the real behavior in an isolated OMP (next section). Tests alone are not proof; exercise the changed path.
5. Update the extension's `README.md`, and bump `version` if behavior changed.
6. Deploy: `darwin-rebuild switch --flake .#<host>` (or the NixOS equivalent). OMP loads extensions at session start and has no reload command, so start a new session.

## Smoke-test in an isolated OMP

Test against a throwaway agent directory, never against `~/.omp/agent`. Otherwise the installed copy of the same extension also loads from the Nix store, and your runs write into the real config and sessions.

```sh
d=$(mktemp -d); mkdir -p "$d/agent"; echo '{}' > "$d/overlay.yml"
export PI_CODING_AGENT_DIR="$d/agent" PI_CONFIG_FILES="$d/overlay.yml"
```

`PI_CODING_AGENT_DIR` moves OMP's config, sessions, and databases. The exported `PI_CONFIG_FILES` replaces the overlay list from `~/.omp/.env`, so the store extensions from `nix-config.yml` don't load. Delete `$d` afterwards.

Load the extension from source for one run with `-e <folder>` (repeatable). To reproduce the installed setup instead, put the settings you need into `$d/overlay.yml` or `$d/agent/config.yml`, or link a generated file from a built Home Manager generation.

No model call, check that it loads and registers commands:

```sh
(sleep 8) | omp --mode rpc --no-session -e ./parts/ai/omp-extensions/<name> 2>"$d/err" \
  | jq -r 'select(.type=="available_commands_update") | .commands[].name' | sort -u
```

- `get_commands` is not an RPC command; the command list arrives in `available_commands_update` frames.
- `ctx.ui.notify` shows up as `{"type":"extension_ui_request","method":"notify","message":...}`.
- Send RPC commands on stdin after a short sleep, for example `{"type":"set_steering_mode","mode":"all","id":"1"}`. The RPC `set_model`, `set_steering_mode`, and `set_thinking_level` commands change the session only and never write `config.yml`.
- To exercise a persisted settings write (what `/settings` and the terminal `/model` do), load a second throwaway extension that calls `lookup("<setting id>").set(pi.pi.settings, value)` from `@oh-my-pi/pi-coding-agent/config/registry` in `session_start`.
- Startup errors land in `$d/err`; `grep -i error "$d/err"`.

With a model call, when the behavior only shows in a real turn (system prompt additions, tool gating, continuation messages):

```sh
omp -p 'No tool calls. <question that reveals the behavior>' --no-session --thinking off --model <cheap model> -e <folder>
```

The isolated directory has no provider setup. Copy what the provider needs into `$d/agent` (for example `.env` and `models.yml` from `~/.omp/agent`) without printing them, and load any extension the provider depends on with another `-e`. A mode that needs a UI (`ask` forms) runs with `--mode rpc-ui`; answer `extension_ui_request` frames with `{"type":"extension_ui_response","id":...,"cancelled":true}`.

Observed limits worth knowing before designing an extension:

- `settings.onEffectiveChange` listeners fire only when the effective value changes. A write that an overlay masks produces no event.
- Settings listeners run synchronously inside the write; the save to `config.yml` follows about 100 ms later.
- Extensions don't run for `omp config ...` subcommands.

## Change the module

- Keep option descriptions free of `cfg` references; they are rendered without a configuration.
- Build a throwaway Home Manager configuration that exercises the options you touched and inspect the generated files, then the real host:

  ```sh
  nix build --impure --no-link --print-out-paths --expr '
    let
      f = builtins.getFlake (toString ./.);
      pkgs = import f.inputs.nixpkgs {
        system = "aarch64-darwin";
        overlays = [f.overlays.latest-packages f.overlays.common-external f.overlays.ai];
        config.allowUnfree = true;
      };
    in (f.inputs.home.lib.homeManagerConfiguration {
      inherit pkgs;
      modules = [f.homeModules.oh-my-pi {
        home = { username = "t"; homeDirectory = "/tmp/hmt"; stateVersion = "26.05"; };
        programs.oh-my-pi = { enable = true; /* options under test */ };
      }];
    }).activationPackage'
  # then: find -L <result>/home-files/.omp; cat <result>/home-files/.omp/.env
  nix build '.#darwinConfigurations.<host>.config.home-manager.users."<user>".home.activationPackage' --no-link
  ```

- Point an isolated OMP (above) at the generated files: link `<result>/home-files/.omp/agent/*` into `$d/agent` with `cp -RP` so symlinks stay symlinks, which is how Home Manager installs them.
- The module builds `nix-settings-notice` from `../omp-extensions` itself, so it works without `overlays.ai`.

## Add or remove an extension

- Add: copy a folder, rename it, fix `package.json` and `bun.lock` (`bun install`), write the code, tests, and README, `git add -N` it. `omp-extension-<name>` and `pkgs.omp-extensions.<name>` appear automatically. Enable it in `profiles/home/dev/ai.nix` (`programs.oh-my-pi.extensions`; order is load order).
- Remove: delete the folder and its entry in the profile.

## GSD

- `packages/gsd-omp/README.md` has the version bump procedure.
- `omp-extension-gsd` runs `gsd-omp install --root $out`, so GSD's runtime root is its own store path: the extension, `agents/`, and `skills/` all load from there, and GSD's `GSD_AGENTS_DIR` hint points at `$out/agents`.
- After a bump, build `omp-extension-gsd` and check in an isolated OMP that the `/gsd-*` commands register and a GSD subagent (for example `gsd-planner`) is available.
- Not supported with the store install: `gsd-omp doctor` and `update` (no manifest in the agent directory, no global npm), and `/gsd-surface` (it rewrites the skills directory in place). Hide GSD skills with `programs.oh-my-pi.settings.skills.ignoredSkills` (glob patterns) instead. A hidden skill's `/gsd-<name>` command stays registered but can no longer read its skill, and GSD hooks dispatch skills by name (`code-review`, `validate-phase`, `secure-phase`, `ui-review`, `ui-phase`, `ai-integration-phase`, `mempalace-*`), so don't hide a skill that a command you use or an active hook needs.

## Paseo

`programs.paseo` manages the Paseo daemon's `~/.paseo/config.json` and its plugins. Paseo itself (`pkgs.paseo-desktop`) is installed and signed by `profiles/home/dev/ai.nix`, which also enables the module with the daemon settings and the shared plugin list. What belongs to one user or machine goes in that user's file, and the module deep-merges both: the model Paseo names agents with (`programs.paseo.settings.agents.metadataGeneration`, like the OMP roles), and plugins tied to the machine (`vpn`, for the work VPN in Tunnelblick). Versions refer to Paseo 0.11.0-beta.5; recheck after upgrades.

The `paseo` input is a fork, `github:truelecter/paseo/local`: upstream `main` plus SDK commits that upstream hasn't merged yet (agent `forkContext()` from getpaseo/paseo#5003 and agent `rewind()`), which `beautiful-chat` needs to bring back Paseo's Fork and Rewind. To move to a newer Paseo, rebase `local` onto the new upstream commit or tag, force-push it, `nix flake update paseo`, then run the end-to-end suite. Once upstream ships both APIs, point the input back at `github:getpaseo/paseo/<tag>`.

### How Paseo reads what the module writes

- `config.json` is Paseo's own file: the daemon rewrites it on every settings or plugin change (`DaemonConfigStore.patch()`), re-reading it from disk first, so it can't be a Home Manager link. There is no overlay or include, and the schema is strict: an unknown key makes the daemon reject the file. The activation step `paseoConfig` (`paseo-sync.sh`) deep-merges `programs.paseo.settings` into it (maps merge, lists and values replace) and keeps every other key. `daemon.hostnames` stays unmanaged because the `tailscale-listener` plugin writes it.
- Plugins are only found through `config.json` entries `plugins.<id> = {source: "directory", path, enabled}`. Paseo compiles a plugin with its own esbuild when it loads or reloads it and writes nothing into the plugin folder, so a store path works. zod, react, react-native, @tanstack/react-query, and `@getpaseo/plugin` come from the daemon; anything else must be in the plugin's own `node_modules`. That includes type-only imports: the compiler resolves them too, so `import type ... from "@getpaseo/client"` typechecks in a checkout (where `bun install` put it) and then fails the plugin's load with `Could not resolve type dependency`. Reach the SDK client's types through `@getpaseo/plugin` (for example `PluginHandlerContext["paseo"]`).
- The entry's `path` is stored as given (`path.resolve`, no symlink resolution); Paseo follows the link only when it compiles. The module links each plugin to `~/.paseo/hm-plugins/<id>` and lists that path, so the entry stays the same across rebuilds and only the link target changes. Link the whole directory: Paseo rejects source files whose real path is outside the plugin folder's real path, so `recursive = true` per-file links would break it (a symlinked `node_modules` package is allowed).
- The links are `home.file` entries with `force = true`, so a link repointed by hand (`paseo-plugin-dev link`) doesn't fail the next switch's collision check; `backupFileExtension` doesn't help there, because Home Manager never backs up a symlink. Home Manager replaces only the link (`ln -Tsf`), never the folder it points to.
- A running daemon keeps the plugin list in memory and writes all of it back on every plugin change; `paseo daemon reload` reloads `config.json` except `plugins`. So `paseo-sync.sh` first applies plugin changes through the CLI (`plugin install`, `enable`, `disable`, `reload`), then writes `config.json`, then runs `paseo daemon reload` when settings changed. It reloads a running plugin whose link target differs from before the switch: the activation step `paseoPluginTargets` records the targets right before `linkGeneration` (`paseo-hm-sync targets`), so a link that `paseo-plugin-dev` had pointed at a checkout counts too.
- A plugin that the daemon loaded from a different path, or one removed from `programs.paseo.plugins`, can't be changed live: `paseo plugin uninstall` deletes `~/.paseo/plugin-settings/<id>`, and `install` refuses an id that is already configured. The step updates `config.json`, disables a removed plugin, and prints `paseo: restart Paseo to finish applying: ...`. Until that restart, any plugin change in Paseo writes the old paths back; the next switch fixes them again.
- Settings stay mutable: a value changed in Paseo's settings UI lasts until the next activation sets it back.
- The CLI is the app-bundled one (`programs.paseo.cli`, default `~/Applications/Home Manager Apps/Paseo.app/Contents/Resources/bin/paseo`), so the step runs after `copyApps` and `signPaseo`. It doesn't start a daemon: with none running, `plugin ls` fails and only the file is written.

### Plugin anatomy

- Entry points `index.client.ts(x)` and/or `index.server.ts`, with code only in `client/`, `server/`, or `shared/`. Imports use explicit `.ts` extensions: Bun, `tsc` (`allowImportingTsExtensions`), and Paseo's esbuild bundle all accept them.
- Plugins that edit Paseo's rendered page (`wide-chat`, `project-groups`, `header-tab-name`) keep every DOM access in `client/web.ts`, gated on `Platform.OS === "web"`, and tie themselves to Paseo's DOM (test IDs, element nesting, Unistyles CSS variables). Check that DOM against the Paseo source for the pinned version (`~/.cache/agent-exploration-repos/paseo` at the matching tag) before relying on it; `project-groups/README.md` describes how to inspect the live DOM from a Paseo browser tab.
- A command that ships with a plugin goes in `extraAttrs.<id>.passthru.cli` (today `backlog`: `cli/backlog`, a `writeShellApplication` with `curl` and `jq`). The module puts it on `PATH` for every configured plugin that has one. Keep `backlog`'s CLI, its socket API (`server/http.ts`), and the `backlog` skill (`profiles/home/dev/_files/omp/skills/backlog/`) in step.
- `paseo-plugin.json` with an `id` equal to the folder name, and `requirements.paseo`. The build checks the range against the pinned Paseo (`inputs.paseo`) and fails evaluation when it doesn't hold. Plugins tied to Paseo's DOM (`header-tab-name`, `project-groups`, `wide-chat`) use `~0.11.0`, so a Paseo bump to another minor stops the build until someone checks their selectors against the new version (run the end-to-end suite) and widens the range. Plugin-SDK-only plugins use `>=0.10.0`. `semver.nix` understands space-joined `>=`, `>`, `<=`, `<`, `=`, `~`, `^` comparators on full versions and rejects anything else; a prerelease pinned Paseo (`0.11.0-beta.5`) is compared by its stable core (`0.11.0`), as Paseo's own check does.
- `package.json` with `version` (it ends up in the store path name; bump it when behavior changes), `typecheck` and `test` scripts. The build runs the files of the `test` script (`bun test <globs>`) in its `checkPhase`, with `_test-deps` in `node_modules`, so a failing test fails the package and the system build.
- `dependencies` only for what the daemon doesn't provide. They ship in the package's `node_modules` from a fixed-output `bun install --production --frozen-lockfile` (`paseo-plugins/node-modules.nix`), whose hash is in `nodeModulesHashes` in `paseo-plugins/default.nix` (today only `beautiful-chat`). After changing `package.json` or `bun.lock`, set the entry to `lib.fakeHash`, build, and copy the hash from the error. The same goes for `_test-deps` after changing its lock.
- The build copies the folder minus tests, `bun.lock`, `.showcase/`, and `node_modules`. Per-plugin derivation attributes go in `extraAttrs` there (`vpn` swaps the system curl in its Tunnelblick script for Nix's during tests). A plugin whose `meta.platforms` excludes the host is left out of the package set: `vpn` drives Tunnelblick through `osascript` and `system-health` samples `top`, `vm_stat`, and `lsof`, so both are Darwin-only and `pkgs.paseo-plugins.<id>` doesn't exist on Linux (enabling one there fails the module's `package` assertion; `profiles/home/dev/ai.nix` enables `system-health` with `lib.mkIf` on Darwin).
- Plugin builds prefer the local machine (`preferLocalBuild`): on the `tl-mm4` remote builder the `vpn` script tests fail.

### Change a plugin

1. Edit the folder (`git add -N` new files). From the plugin folder, type check and unit test with the `latest` Bun, then remove the install:

   ```sh
   nix shell --inputs-from "$(git rev-parse --show-toplevel)" latest#bun \
     -c sh -c 'bun install --frozen-lockfile && bun run typecheck && bun run test'
   rm -rf node_modules
   ```

2. `nix build .#paseo-plugin-<id> -L`, which runs the tests again in the sandbox.
3. Try it in the live Paseo without a switch (see "Develop a plugin without a switch" below), and run the end-to-end suite (`nix run .#paseo-plugins-e2e`).
4. Update the plugin's `README.md`, bump `version` if behavior changed, and deploy with `darwin-rebuild switch --flake .#<host>`; the activation step reloads every plugin whose link target changed, and puts every hand-repointed link back on its store build.

### Develop a plugin without a switch

A switch needs sudo and brings along everything else that changed in the flake (OMP, other packages), so plugin work doesn't wait for one. `paseo-plugin-dev` (installed by the module) repoints a plugin's `~/.paseo/hm-plugins/<id>` link and reloads the plugin in the running daemon. `config.json` doesn't change, because Paseo keeps the link path and follows it only when it compiles the plugin.

```sh
paseo-plugin-dev link wide-chat              # from anywhere in the checkout: links parts/ai/paseo-plugins/wide-chat
paseo-plugin-dev link wide-chat <folder>     # or an explicit folder, for example in a worktree
paseo plugin reload wide-chat                # after each edit; `paseo plugin logs wide-chat` shows its output
paseo-plugin-dev status                      # which plugins run their installed build, which a folder
paseo-plugin-dev restore wide-chat           # back to the installed build, reloaded
```

- `link` checks that the folder's `paseo-plugin.json` has the same `id`, and refuses a plugin with `dependencies` (today `beautiful-chat`) until `bun install` has run in the folder, because a checkout has no store-built `node_modules`.
- The next switch puts every link back on its store build and reloads the plugin; the edits stay in the checkout, they just stop being loaded. Link again to continue.
- The Paseo daemon's shell may not have `paseo-plugin-dev` or the Paseo CLI on `PATH`; then use `/etc/profiles/per-user/$(id -un)/bin/paseo-plugin-dev` and `~/Applications/Home Manager Apps/Paseo.app/Contents/Resources/bin/paseo`.

### Agents editing plugins

An agent is the main editor of these plugins, and it usually runs inside the same Paseo it is changing. So:

- Never restart or stop Paseo or its daemon (`paseo daemon restart`, `paseo daemon stop`, quitting the app): that kills the agent and every other running agent. `paseo plugin reload <id>` is safe. When a change needs a restart (a plugin added or removed, a path change), tell the user instead.
- Don't run `darwin-rebuild switch` to try a change: it needs the user's sudo and updates unrelated packages. Use `paseo-plugin-dev link <id>` from the checkout or worktree you edit in.
- The linked folder is what the user's Paseo runs. Reload only after `bun run typecheck` and `bun run test` pass in the plugin folder, and check `paseo plugin logs <id>` after the reload. A broken client plugin can break the UI the user is reading you in; `paseo-plugin-dev restore <id>` undoes it.
- Several agents work at once. Run `paseo-plugin-dev status` before linking: a plugin linked to a folder that isn't yours belongs to another agent, so leave it and tell the user.
- Verify with `nix build .#paseo-plugin-<id> -L` (the sandboxed tests) and the end-to-end suite, which loads the store builds, not the link. Before the final reply, report `paseo-plugin-dev status`: say which plugins are still linked to your folder (the live Paseo keeps running that code until a restore or the next switch), or restore them.

### Add or remove a plugin

- Add: create `paseo-plugins/<id>/` (copy a plugin with the same client/server shape), `git add -N` it, and list it in `programs.paseo.plugins`: in `profiles/home/dev/ai.nix`, or in a user's file when it is tied to that machine. `paseo-plugin-<id>` and `pkgs.paseo-plugins.<id>` appear automatically, and the plugin option defaults its `package` to that. The end-to-end harness loads it too; add `_e2e/specs/<id>.spec.ts` for it.
- Remove: delete the folder, its `_e2e/specs/<id>.spec.ts`, and its `programs.paseo.plugins` entry; the next switch disables it and drops it from `config.json`, and it is gone after a Paseo restart. Its settings in `~/.paseo/plugin-settings/<id>` stay.

### End-to-end tests

`paseo-plugins/_e2e/` drives the real Paseo web UI in headless Chromium against an isolated Paseo daemon that loads every plugin from its store build, with one Playwright spec per plugin in `specs/<id>.spec.ts`. It catches a Paseo or nixpkgs upgrade that breaks a plugin, so run it after bumping the `paseo` input (or the flake) and after changing a plugin. It needs nothing outside its own processes (no apps, windows, Tailscale, or network), so it runs on Linux and macOS (`x86_64-linux`, `aarch64-linux`, `aarch64-darwin`) and in CI.

```sh
nix run .#paseo-plugins-e2e                          # the whole suite, about 3 minutes on a Mac
nix run .#paseo-plugins-e2e -- specs/wide-chat.spec.ts   # arguments go to `playwright test`
nix run .#paseo-plugins-e2e -- --grep "Backlog"
```

- The harness (`_e2e/run.sh`, wrapped by `_e2e/default.nix`) creates `/tmp/paseo-e2e.XXXXXX` (or `PASEO_E2E_ROOT`, a new or empty folder) and writes `paseo/config.json` there: a free port (never 6767), relay off, the web UI on, dictation and voice mode off (they slow the start), the real agent providers off, and a `directory` entry per plugin. It starts Paseo's supervisor from `pkgs.paseo` (the server package: daemon, CLI, and daemon web UI) directly with the package's node in development mode: `bin/paseo-server` forces production mode, which hides the `mock` agent provider, and `paseo daemon start` fails in that package (`@getpaseo/server`'s main file is missing from its traced closure in 0.10.2). The daemon gets `HOME`, `PASEO_HOME`, and `PASEO_BACKLOG_DIR` inside the temp folder, so nothing reaches `~/.paseo`, `~/.local/share`, or the daemon on 6767. Once the worker listens and every plugin has started, it runs Playwright from nixpkgs (`playwright-test`, with its own Chromium), and it stops the daemon on exit. The start takes about a minute, most of it loading `beautiful-chat`'s server.
- Trade-off: the suite tests the server package's daemon on its nixpkgs node, not the copy the desktop app embeds in Electron. Both come from the same source and use the same plugin loader and web UI bundle, but an Electron- or app-only regression would not show.
- On Linux the harness sets `FONTCONFIG_FILE` to a DejaVu-only fontconfig: Chromium aborts (`SkFontMgr_FontConfigInterface ... Not implemented`) without one, as in a build sandbox, and a fixed font set keeps text metrics the same across machines. The suite also runs inside a Linux build sandbox (loopback only, no network), which is how to check a Linux system from a Mac: a throwaway `runCommand` with `paseo-plugins-e2e` in `nativeBuildInputs`, `HOME` and `PASEO_E2E_ROOT` under `$TMPDIR`, built on a Linux builder.
- The daemon's web UI (`features.webUi`) connects the page to the daemon without pairing. The specs seed projects and mock agents through `DaemonClient` from `@getpaseo/client` over the daemon's WebSocket, as Paseo's own e2e suite (`packages/app/e2e/` in its repository) does.
- When the run fails or is interrupted, the harness keeps the temp folder and prints its path: `paseo/daemon.log` (with plugin output), `test-results/` (screenshot, trace, and browser console of each failed test), and `report/` (open it with `nix shell nixpkgs#playwright-test -c playwright show-report <dir>/report`). `PASEO_E2E_KEEP` set to any value keeps it after a pass too. Remove it when done.
- `PASEO_E2E_SUITE=parts/ai/paseo-plugins/_e2e` runs the specs from the checkout instead of the store copy, so editing a spec needs no rebuild (plugin changes still do, or use an override).
- `PASEO_E2E_PLUGIN_OVERRIDES="<id>=<dir> ..."` loads a plugin from another folder (a checkout, or a copy with a deliberate break), and `<id>=` with nothing after it leaves the plugin out; an unknown id stops the harness. Use it to check that a spec fails without its plugin: `PASEO_E2E_PLUGIN_OVERRIDES="wide-chat=" nix run .#paseo-plugins-e2e -- specs/wide-chat.spec.ts` must fail.
- Not tested and not loaded: `todowrite2-tasks` (an archived OpenCode-only plugin; the mock provider can't emit `todowrite2` calls) and `vpn` (it reads the real Tunnelblick and OpenVPN Connect apps through `osascript`, and its plugin APIs, RPC and a sidebar screen, are covered by `backlog`). The suite must not depend on apps, windows, or services outside its own processes. `system-health` only reads system tools that every Mac has; it is loaded where its package exists (Darwin), and its spec skips itself on Linux.
- `tailscale-listener` gets a stand-in for Tailscale: `PASEO_TAILSCALE_ADDRESS=::1` (the daemon listens on 127.0.0.1, so the port is free on IPv6 loopback, which macOS and Linux both have) and `PASEO_TAILSCALE_HOSTNAMES=e2e-host.e2e-tailnet.ts.net` in place of the MagicDNS lookup. Its spec loads the UI through `http://[::1]:<port>/`, checks that the names reached `daemon.hostnames` through `paseo daemon config set` (the CLI from `PASEO_CLI`, the package's `bin/paseo`), and that the running daemon then accepts the name as a Host header (the plugin saves during the daemon's start, before the daemon can apply it, and saves again until it does). Nothing is exposed beyond loopback.
- CI: `.github/workflows/paseo-plugins-e2e.yaml` runs the suite on `ubuntu-latest` (x86_64) on every push that changes `flake.lock`, `flake.nix`, `parts/ai/**`, or the workflow, and on `workflow_dispatch`. A `changes` job (dorny/paths-filter) decides, and `paseo_e2e_aggregated`, a required check (in `shell/nixago/configs/github-settings.nix`, which the dev shell renders to `.github/settings.yml`), passes when the suite passed or was not needed. On failure the run's temp root (`PASEO_E2E_ROOT` under `runner.temp`, with the report and daemon log) is uploaded as the `paseo-plugins-e2e` artifact. The weekly `flake-lock.yaml` PR is pushed with `PR_WF_ENABLED_TOKEN`, so the suite runs on it. It bumps Paseo only when the fork's `local` branch moved since the last lock, so mostly it catches nixpkgs-side breakage (node, Playwright, Chromium, plugin dependencies); a manual Paseo bump runs it too.
- Writing a spec: `support/fixtures.ts` gives `test` (pages can't reach port 6767, a failed test gets the browser console attached, `client` is a `DaemonClient`, `seed(name)` creates a git repository project that is removed after the test), `openApp`, and `openAgent`. `support/paseo.ts` creates mock agents (`e2e-fast-stream` ends a turn in about 2 s before any tool call, `ten-second-stream` also makes read, grep, edit, and bash calls; see `packages/server/src/server/agent/providers/mock-load-test-agent.ts` in Paseo) and app routes. `support/env.ts` has the harness values, such as the daemon home and a plugin's loaded folder. Prefer Paseo's `data-testid`s and the plugin's own markers to text and CSS classes. Every spec must fail without its plugin; check that with an override.
- `@getpaseo/client` in `_e2e/package.json` is pinned to the Paseo version. Bump it with Paseo: update `package.json`, run `bun install` in `_e2e/` to update `bun.lock` (then remove `node_modules`), and refresh the hash in `_e2e/default.nix` (`lib.fakeHash`, build, copy the hash from the error).

### Change the module

Test `paseo-sync.sh` against an isolated daemon, never `~/.paseo`: write a `config.json` with another `daemon.listen` (for example `127.0.0.1:6799`) and `relay.enabled = false` into a temp folder, then `paseo daemon start --home <dir>`, run the script with `PASEO_HOME=<dir>` and `PASEO_CLI` set to the CLI, inspect `paseo plugin ls --json --home <dir>` and `<dir>/config.json`, and `paseo daemon stop --home <dir>`. Use plugins without host side effects (`catppuccin-mocha`, `header-tab-name`, `wide-chat`, `workspace-title-sync`): `backlog` and `vpn` open sockets under `~/.local/share` that the real ones use, and `tailscale-listener` binds the Tailscale address. To preview what a switch writes, run the built script (from the generation's `activate`) with `PASEO_HOME` pointing at a copy of `~/.paseo/config.json` and no `PASEO_CLI`, and diff the result.

## SearXNG module

`services.searxng` follows the NixOS `services.searx` options (`settings`, `settingsFile`, `environmentFile`, `faviconsSettings`, `limiterSettings`, `redisCreateLocally`, `package`) as a user service: a systemd user unit on Linux, a launchd agent on macOS. The system-only options (`configureUwsgi`, `configureNginx`, `uwsgiConfig`, `domain`, `openFirewall`) are left out.

- One launcher script runs on both platforms: it sources `environmentFile` (shell `KEY=value`), renders `settings` through `envsubst` into `$XDG_STATE_HOME/searxng/settings.yml` (mode 600), links `favicons.toml` and `limiter.toml` next to it (SearXNG reads them from the settings file's folder), and starts `searxng-run`.
- SearXNG exits on the default `ultrasecretkey`. Without `settings.server.secret_key` and a custom `settingsFile`, the launcher generates `$XDG_STATE_HOME/searxng/secret_key` once and exports it as `SEARXNG_SECRET`; a `SEARXNG_SECRET` from `environmentFile` wins.
- `redisCreateLocally` runs Valkey as a second user service (`searxng-valkey`) on `$XDG_STATE_HOME/searxng/valkey.sock`.
- macOS logs go to `~/Library/Logs/searxng.log`; Linux logs go to the journal (`journalctl --user -u searxng`). The built-in server logs queries.
- `profiles/home/dev/ai.nix` enables it on `127.0.0.1:8888` with JSON output and routes OMP's `web_search` to OMP's built-in `web/searxng` provider (`modelRoles.web`, `searxng.endpoint`, `searxng.engines`), falling back to `web/exa` and `web/parallel`. The default scraped engines (DuckDuckGo, Brave, Startpage) answer bots with captchas or rate limits, so `searxng.engines` picks ones that return results. Check from the shell: `omp search --compact -l 3 '<query>'` shows `Provider: SearXNG`.
- Test it like the OMP module: build a throwaway `homeManagerConfiguration` with `f.homeModules.searxng`, then run the launcher from the generated plist (`<result>/LaunchAgents/org.nix-community.home.searxng.plist`) and query `http://127.0.0.1:8888/search?q=test&format=json` (needs `settings.search.formats = ["html" "json"]`).

## Before you finish

- `nix build` of every package you touched, and of the host's Home Manager generation.
- The smoke run that exercises the change, with its output.
- READMEs and this file in step with the change.
