# paseo-tools (OMP extension)

Paseo tools for an [Oh My Pi](https://github.com/can1357/oh-my-pi) (`omp`) agent running under [Paseo](https://github.com/getpaseo/paseo): `set_title`, and a switch that keeps Paseo's `browser_*` tools out of the session until they are needed (`/paseo-browser`, `enable_browser_tools`).

## Why

Paseo names a new agent after the first line of its first prompt, cut to 60 characters, and an agent should retitle itself when the conversation moves on. Paseo's own `update_agent` tool needs the caller's agent id, which Paseo puts in `PASEO_AGENT_ID` but never shows the model: the agent guessed `self` (rejected with `Agent not found: self`) or ran `echo $PASEO_AGENT_ID` in bash, which asks for approval in Write Approval mode. An earlier extension put the id and the retitle rules into the system prompt through `before_agent_start` and a `context` handler, which needed two code paths (extension-started turns such as GSD's `/gsd-*` commands skip `before_agent_start`) and triggered an OMP bug that listed the xd:// tools twice.

`set_title` needs no id, and its description carries the retitle rules, so they reach every request, including extension-started turns, with no prompt injection. It also renames the OMP session, so `/resume` and the session list show the same title as Paseo.

## What it does

- Reads `PASEO_AGENT_ID` and `PASEO_CLI` (the absolute path of the bundled `paseo` CLI, set by Paseo for every agent process) once at load. If either is missing, or the id is not a plain id (letters, digits, `-`), the extension registers nothing, so terminal sessions are unaffected.
- Registers `set_title` as an essential tool (top-level, declared from the first request, not behind xd://). Its description says when to retitle: at the start of a user turn when the focus moved away from the current title, not for small detours, and on the first turn when the first prompt was a bare slash command such as `/gsd-execute-phase 8`. Its last line names the agent's own Paseo agent id for other Paseo tools that act on the caller, such as `get_agent_status`.
- A call trims the title and collapses whitespace and newlines to single spaces. An empty title, or one over 60 characters (counted in code points), is a tool error asking the model to shorten it; titles are never cut.
- Runs `"$PASEO_CLI" agent update "$PASEO_AGENT_ID" --name <title> --json` without a shell, with a 15 s timeout and the tool call's abort signal. A CLI failure is a tool error with the CLI's stderr. On success it calls `pi.setSessionName(title)`; if that fails, the result says so, but the call still succeeds, because Paseo already has the new name.
- OMP runs every extension in each subagent session too (task tool, eval `agent()`, `/tan` clones), with the same environment, so a subagent could rename its parent's Paseo agent. On `session_start` a subagent session (`ctx.agent.kind === "sub"`) drops `set_title` from its active tools, and `execute` refuses with an error for a subagent as a second guard.
- `profiles/home/dev/ai.nix` allows `set_title` without an approval card (`tools.approval.set_title = "allow"`).

## Browser tools

Paseo registers 22 `browser_*` host tools that drive tabs inside the Paseo app. They are rarely needed, and as xd:// devices they still cost a catalog line each on every request (about 1.4k tokens with claude-v5). So the main session starts with them off:

- Off removes every `browser_*` tool from the active tool set. Paseo sends its host tools (`set_host_tools`) after the session starts, and OMP activates them on arrival without an extension event, so the state is applied again before every user turn (`input`) and every agent start (`before_agent_start`, which never returns a system prompt). Both are no-ops once the set matches.
- OMP announces xd:// unmounts as a notice and keeps the system prompt, so the catalog would still list the devices. When it removes them, the extension leaves out its own tool for one extra apply, which changes the top-level tool set and makes OMP rebuild the prompt. Mid-conversation, OMP skips that rebuild for models that bind thinking to the prompt prefix and sends its notice instead.
- `/paseo-browser on`, `/paseo-browser off`, or `/paseo-browser` (toggle) switches them and notifies the new state. `/browser` is taken by OMP's own command for its eval browser.
- `enable_browser_tools` (essential, `enabled: boolean`) lets the model switch them: its description tells it to turn them on before it needs them and off again when the browser work is done. `profiles/home/dev/ai.nix` allows it without an approval card.
- The state is a session entry (`paseo-browser-tools`), restored from the current branch on `session_start`, `session_switch`, `session_branch`, and `session_tree`, so a resumed session keeps it. New sessions start off.
- Limit: switching them on mid-session makes them 22 top-level tools (about 7k tokens per request), not xd:// devices. OMP pins every tool that `setActiveTools` adds and that is not mounted at that moment as top-level, and no extension API mounts a tool. A resumed session that was on leaves Paseo's host tools alone, so there they stay mounted as xd:// devices.
- Subagents get no Paseo host tools; they don't get `enable_browser_tools` either (hidden on `session_start` like `set_title`).

## Install

Packaged as `pkgs.omp-extensions.paseo-tools` (flake output `omp-extension-paseo-tools`). Enable it through the Home Manager module; OMP loads it on the next session start:

```nix
programs.oh-my-pi.extensions = [pkgs.omp-extensions.paseo-tools];
```

## Layout

- `index.ts`: wiring only: reads the environment, registers `set_title`, `enable_browser_tools`, and `/paseo-browser`, applies the browser state, hides the main-only tools in subagent sessions.
- `shared/env.ts`: reads and checks `PASEO_AGENT_ID` and `PASEO_CLI`.
- `shared/paseo-cli.ts`: runs the Paseo CLI without a shell, with a timeout and an abort signal.
- `shared/set-title.ts`: the tool's description, title checks, the rename and the subagent rule.
- `shared/browser-tools.ts`: the browser switch: descriptions, the active-set reconcile, the session-entry restore, the command argument.
- `shared/*.test.ts`: tests for the above.
- `types/omp.d.ts`: minimal types for the parts of OMP's extension API used here. OMP provides `@oh-my-pi/pi-coding-agent` at runtime, so it is not installed.

New Paseo tools go in their own `shared/<tool>.ts`, registered from `index.ts`.

## Develop

`nix build .#omp-extension-paseo-tools` runs the tests. Type checks, from this folder:

```sh
bun install
bun run typecheck
bun run test
```
