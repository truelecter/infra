# paseo-agent-id (OMP extension)

Tells an [Oh My Pi](https://github.com/can1357/oh-my-pi) (`omp`) agent running under [Paseo](https://github.com/getpaseo/paseo) its own Paseo agent id.

Paseo starts every agent process with `PASEO_AGENT_ID` set, but never shows the id to the model. Paseo tools that act on the caller, such as `update_agent` (retitling after a topic change) or `get_agent_status`, need it as `agentId`. Without it the agent guesses `self`, which Paseo rejects with `Agent not found: self`, or has to run `echo $PASEO_AGENT_ID` in bash, which asks for approval in Write Approval mode.

## What it does

- Reads `PASEO_AGENT_ID` once at load. If it is unset, empty, or not a plain id (letters, digits, `-`), the extension does nothing, so terminal sessions are unaffected.
- Before each request, appends a short system prompt section naming the id, telling the agent to pass it as `agentId` for Paseo tools acting on itself, and to check at the start of each turn whether the focus moved away from its title (then retitle first). Paseo's own `appendSystemPrompt` rule alone was not enough: in testing the agent only retitled when asked.

## Install

Packaged as `pkgs.omp-extensions.paseo-agent-id` (flake output `omp-extension-paseo-agent-id`). Enable it through the Home Manager module; OMP loads it on the next session start:

```nix
programs.oh-my-pi.extensions = [pkgs.omp-extensions.paseo-agent-id];
```

## Layout

- `index.ts`: the extension: reads the variable, registers `before_agent_start`.
- `shared/prompt.ts`: pure logic (id check, prompt text), tested.
- `types/omp.d.ts`: minimal types for the parts of OMP's extension API used here. OMP provides `@oh-my-pi/pi-coding-agent` at runtime, so it is not installed.

## Develop

`nix build .#omp-extension-paseo-agent-id` runs the tests. Type checks, from this folder:

```sh
bun install
bun run typecheck
bun run test
```
