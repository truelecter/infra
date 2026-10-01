# hide-denied-tools (OMP extension)

Status: not enabled by default. Filtering MCP tools at the server (an allowlist in the server's own config) keeps unused tools from registering at all, which is cheaper than hiding them. Add it to `programs.oh-my-pi.extensions` when you deny tools in `tools.approval`.

Takes tools that `tools.approval` denies out of the model's tool list in [Oh My Pi](https://github.com/can1357/oh-my-pi) (`omp`).

## Why

A `deny` in `tools.approval` blocks the call, but the tool stays visible, so the model still sees it and may try it. With this extension the model only sees the tools it may call, which also keeps large MCP servers from crowding the tool list. OpenCode hides denied tools the same way.

## What it does

On session start, before every prompt, and at every turn, it reads the effective `tools.approval` setting and removes every enabled tool whose policy is `deny` (top-level tools and `xd://` mounts alike), through `setActiveTools`. The per-turn check covers MCP servers that connect late and mount their tools in the middle of a turn: OMP only tells the model about new mounts with its next request, and an unmount before then cancels that announcement. It changes the tool list only when a denied tool is actually enabled, so the prompt cache isn't disturbed on every turn. `prompt` and `allow` policies are left alone.

Two settings in `~/.omp/agent/config.yml` go with it: `startup.quiet: true`, which hides OMP's `xd://: mounted ...` notice listing every MCP tool, and the [`mcp-ready`](../mcp-ready/README.md) extension, which makes sure MCP tools are mounted (and so filtered) before the first prompt.

## Install

Packaged as `pkgs.omp-extensions.hide-denied-tools` (flake output `omp-extension-hide-denied-tools`). Enable it through the Home Manager module; OMP loads it on the next session start:

```nix
programs.oh-my-pi.extensions = [pkgs.omp-extensions.hide-denied-tools];
```

## Layout

- `index.ts`: the extension. It reads the setting through `lookup("tools.approval")` from `@oh-my-pi/pi-coding-agent/config/registry`, with `pi.pi.settings` as the scope (the documented way since OMP 18.3).
- `shared/filter.ts`: the pure filter, tested.
- `types/omp.d.ts`: minimal types for the OMP APIs used; OMP provides the modules at runtime.

## Develop

`nix build .#omp-extension-hide-denied-tools` runs the tests. Type checks, from this folder:

```sh
bun install
bun run typecheck
bun run test
```

Check in OMP, no tool calls: `omp -p 'No tool calls. Is mcp__tracker_search_logs in your tool list?' --no-session` should answer no.
