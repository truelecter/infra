# caveman (OMP extension)

Caveman mode for [Oh My Pi](https://github.com/can1357/oh-my-pi) (`omp`): the agent answers in terse, article-free prose while keeping code, commands, and technical terms exact. Don't also put a caveman block in `~/.omp/agent/AGENTS.md`.

Modelled on [TophC7's `caveman.ts`](https://github.com/TophC7/dot.nix/blob/main/modules/features/agents/home/omp/agent/extensions/caveman.ts), extended with the caveman skill's intensity levels and its natural-language toggles.

## What it does

- Appends a caveman section to the system prompt before each request, for the active level: `lite`, `full`, `ultra` (default), `wenyan-lite`, `wenyan-full`, `wenyan-ultra`.
- Turns that an extension starts (`pi.sendMessage` with `triggerTurn: true`, which is how GSD's `/gsd-*` commands run) skip `before_agent_start` in OMP, so a session opened by such a command had no caveman section. A `context` handler covers that case: when the system prompt has no caveman section, it puts the section in front of the request as a hidden custom message.
- `/caveman` toggles on/off; `/caveman <level>` or `/caveman off` sets it. `wenyan` is short for `wenyan-full`.
- Plain messages also switch it: "stop caveman" or "normal mode" turns it off, "talk like caveman" or "caveman mode" turns it back on at the last level.
- Each change is recorded in the session, so resuming, branching, or moving through `/tree` restores the level that was active there.
- The last choice becomes the default for new sessions, saved in `~/.omp/agent/caveman.json` (under a named profile, that profile's agent directory).

The caveman skills in `~/.agents/skills` still load as `/skill:caveman` etc. They are separate from this extension and not needed for it.

## Install

Packaged as `pkgs.omp-extensions.caveman` (flake output `omp-extension-caveman`). Enable it through the Home Manager module; OMP loads it on the next session start:

```nix
programs.oh-my-pi.extensions = [pkgs.omp-extensions.caveman];
```

## Layout

- `index.ts`: the extension: commands, events, state, and the saved default.
- `shared/modes.ts`: pure logic (levels, argument parsing, toggles, prompt text, when a request needs the section as a message), tested.
- `types/omp.d.ts`: minimal types for the parts of OMP's extension API used here. OMP provides `@oh-my-pi/pi-coding-agent` and `@oh-my-pi/pi-utils` at runtime, so they are not installed. Check the types against the OMP source (`packages/coding-agent/src/extensibility/extensions/types.ts`) when OMP changes its extension API.

## Develop

`nix build .#omp-extension-caveman` runs the tests. Type checks, from this folder:

```sh
bun install
bun run typecheck
bun run test
```

Check that OMP loads it and registers `/caveman`, without calling a model:

```sh
(echo '{"type":"get_commands","id":"1"}'; sleep 6) \
  | omp --mode rpc --no-session --model amazon-bedrock/global.anthropic.claude-sonnet-5 \
  | grep -o '"name":"caveman"[^}]*}'
```
