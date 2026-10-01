# mcp-ready (OMP extension)

Holds the first prompt in an [Oh My Pi](https://github.com/can1357/oh-my-pi) (`omp`) session until every configured MCP server has mounted its tools.

## Why

With a UI (interactive mode, and the `rpc-ui` mode Paseo uses) OMP connects MCP servers in the background and does not wait for them before the first prompt (`deferMCPDiscoveryForUI` in `sdk.ts`; `mcp.startupTimeoutMs` only applies to the no-UI path). A server that takes a few seconds to start mounts its tools in the middle of the first turn, and OMP only tells the model about new mounts with the next prompt. Typing in a terminal takes long enough that this rarely shows; Paseo sends the prompt the moment the agent starts, so the first reply had no MCP tools at all.

## What it does

Before the first agent run, it reads the enabled servers from `mcp.json` and `.mcp.json` in `~/.omp/agent/` and `<cwd>/.omp/`, then waits until each has at least one enabled tool (`mcp__<server>_...`), polling every 200 ms, for at most `OMP_MCP_READY_TIMEOUT_MS` (default 20000). A server that never shows up is logged to stderr and the prompt goes ahead without it. Later prompts are not delayed. With no servers configured it does nothing.

Checked with `omp --mode rpc-ui`, prompt sent immediately after start: all MCP tools visible in the first reply, versus none without the extension.

## Install

Packaged as `pkgs.omp-extensions.mcp-ready` (flake output `omp-extension-mcp-ready`). Enable it through the Home Manager module; OMP loads it on the next session start:

```nix
programs.oh-my-pi.extensions = [pkgs.omp-extensions.mcp-ready];
```

## Layout

- `index.ts`: the extension (`before_agent_start` hook).
- `shared/servers.ts`: reading server names from an MCP config, OMP's `mcp__<server>_` prefix, the "which servers are still missing" check; tested.
- `types/omp.d.ts`: minimal types for the OMP APIs used.

## Develop

`nix build .#omp-extension-mcp-ready` runs the tests. Type checks, from this folder:

```sh
bun install
bun run typecheck
bun run test
```
