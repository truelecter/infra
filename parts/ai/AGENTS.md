# AGENTS.md: AI agent tooling (`parts/ai`)

How to change and test the oh-my-pi (`omp`) Home Manager module, the OMP extensions, and the GSD package in this folder. Read it before touching anything under `parts/ai/` or the OMP settings in `profiles/home/dev/ai.nix`.

## Layout

```text
parts/ai/
  default.nix                 flake-parts module: packages, overlays.ai, homeModules.oh-my-pi, homeModules.searxng
  homeModules/oh-my-pi.nix    the programs.oh-my-pi Home Manager module
  homeModules/searxng.nix     the services.searxng Home Manager module (local SearXNG user service)
  omp-extensions/
    default.nix               builds every <name>/ folder, plus `gsd` from packages/gsd-omp
    <name>/                   one OMP extension per folder
  packages/gsd-omp/           the gsd-omp CLI (buildNpmPackage), see its README for updates
profiles/home/dev/ai.nix      the shared profile: extension list and provider-neutral settings
profiles/home/dev/_files/omp/ rules, skills, and subagents linked into ~/.omp/agent
home/users/<os>/<user>.nix    per-user OMP settings: model roles and models.yml for that user's provider
```

Outputs, all from `default.nix`:

| Output | What it is |
| --- | --- |
| `packages.<system>.omp-extension-<name>` | one per folder in `omp-extensions/`, plus `omp-extension-gsd` |
| `packages.<system>.gsd-omp` | the gsd-omp CLI |
| `overlays.ai` | `pkgs.omp-extensions.<name>` and `pkgs.gsd-omp`; the darwin and NixOS configurations apply it |
| `homeModules.oh-my-pi` | `programs.oh-my-pi`; also shared into every Home Manager user |
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
