# say (OMP extension)

Adds a `say` tool that shows the user a Markdown message in the chat, and makes every [Oh My Pi](https://github.com/can1357/oh-my-pi) (`omp`) `ask` form come after an explanation the user can actually read.

On Claude Opus 5.5 (and Fable 5.x), reply text written after a tool result and before another tool call does not come back as a `text` block. The API returns it as a "progress update" `thinking` block holding a short summary written by another model, and hands the model its full original text on the next request. An explanation written right before an `ask` call therefore never reaches the user, while the model believes it did, so reminders and retries change nothing. Anthropic documents this in the Opus 5.5 migration guide ("Text between tool calls"), AWS's Bedrock docs call it connector text summarization with no opt-out, and `display: "updates"` only returns the summary too. Tool input is never summarized, so Anthropic's prompting guide for Opus 5.5 recommends "a simple tool for sending the user a message", declared from the first request. `say` is that tool.

## What it does

- Registers `say({message})` as an essential tool, so it is in the tool list from the first request. It sends `message` as a displayed custom message (`customType: "say"`) with `deliverAs: "aside"` and returns "Shown to the user in the chat.". Paseo shows displayed custom messages as assistant messages, rendered as Markdown; the TUI shows them in a framed block.
- An aside message appears at the next step boundary, after every tool call of the current response has finished. So `say` and `ask` must be in separate responses: in the same response the form would open (and wait) before the explanation shows up.
- Removes `say` messages from what the model sees (`context` event). The model already has the text in its own `say` call; as a custom message it would arrive a second time as a user message.
- Checks every `ask` call (`tool_call` event). It goes through when any of these holds, and is blocked with instructions otherwise:
  - a `say` call finished in an earlier response, and no `ask` form was answered since;
  - the same response has at least 200 characters of reply text (`text` blocks, not thinking) before the call;
  - the previous agent run ended with a final reply of at least 200 characters and no tool calls.
- An `ask` in the same response as a `say` is blocked with "call `ask` again in your next response".
- A cancelled or failed form keeps the explanation for the re-ask; an answered one uses it up.
- After 3 blocked `ask` calls in a row within one agent run, the next one goes through anyway, so an agent that never complies doesn't loop until it gives up with nothing visible. A new run, or a passing `ask`, starts the count over.
- Sessions without an `ask` tool (subagents, print mode) get no `say` tool either.
- OMP runs `tool_call` hooks before `message_end` and delivers `message_update` to extensions through a queue, so the update holding the call can arrive slightly after the hook. The hook waits up to 1 s for it; if it never arrives, the call is judged as if no reply text preceded it.

## Install

Packaged as `pkgs.omp-extensions.say` (flake output `omp-extension-say`). Enable it through the Home Manager module; OMP loads it on the next session start:

```nix
programs.oh-my-pi.extensions = [pkgs.omp-extensions.say];
```

## Smoke test

`ask` needs a UI, so it is missing in `--print` and plain `--mode rpc`. Use `--mode rpc-ui`, load the extension with `-e`, and answer `extension_ui_request` `select` frames with `{"type":"extension_ui_response","id":...,"value":"<option>"}`. Send a `prompt` that makes the model call a tool first (for example read a file), then explain options and ask. Expected with Opus 5.5: a `say` call, then a `message_end` with `role: "custom"` and `customType: "say"`, then in the next response an `ask` call and its `select` request. To see the blocks, tell the model to call `ask` with no text right after the tool result ("Blocked: the user has no explanation...", then `say`, then `ask`), or to call `say` and `ask` in one response ("Blocked: a `say` message is shown only after...", then `ask` alone).

## Layout

- `index.ts`: the extension: registers `say`, tracks the streamed message, wires the gate to `tool_call`, `tool_execution_end`, `turn_start`, `agent_start`/`agent_end`, and filters `context`.
- `shared/gate.ts`: pure logic (reply text before a call, explaining replies, tool and block texts, the `AskGate` state), tested.
- `types/omp.d.ts`: minimal types for the parts of OMP's extension API used here. OMP provides `@oh-my-pi/pi-coding-agent` at runtime, so it is not installed.

## Develop

`nix build .#omp-extension-say` runs the tests. Type checks, from this folder:

```sh
bun install
bun run typecheck
bun run test
```
