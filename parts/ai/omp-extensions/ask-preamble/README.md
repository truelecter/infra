# ask-preamble (OMP extension)

Makes sure an [Oh My Pi](https://github.com/can1357/oh-my-pi) (`omp`) `ask` form only opens after an explanation the user can actually read.

The universal rule "Questions: explain in chat, then short form" asks the agent to describe every question and option in the reply before opening a form with short labels. On Claude Opus 5.5 (and Fable 5.x) that fails mid-turn: reply text written after a tool result and before another tool call in the same message does not come back as a `text` block. The API returns it as a "progress update" `thinking` block holding a short summary written by another model, and hands the model its full original text on the next request. The user sees a bare form under a thinking block, while the model believes it explained everything, so reminders and retries change nothing. Text that ends a turn, and text right after a fresh user message, are shown in full. Anthropic documents this in the Opus 5.5 migration guide ("Text between tool calls"); AWS's Bedrock docs call it connector text summarization and say there is no opt-out.

## What it does

- Records the latest streamed assistant message from `message_update` events.
- On a `tool_call` for `ask`, counts the trimmed reply text before that call in the message. Under 200 characters, it blocks the call. The error explains the summarization and tells the model to end its turn with the full explanation and no tool calls, then call `ask` when asked to continue.
- When that run ends (`agent_end`) with a final assistant message of at least 200 characters of text and no tool calls, it sends a hidden message (`deliverAs: "nextTurn"`, `triggerTurn: true`) that starts the next run: "Your explanation is now shown... Call `ask` now". The first `ask` of that run goes through without text; later ones are checked again.
- After 3 blocked `ask` calls in a row within one agent run, the next one goes through even without text, so an agent that never ends its turn doesn't retry until it gives up with nothing visible. A new run starts the count over.
- OMP runs `tool_call` hooks before `message_end` and delivers `message_update` to extensions through a queue, so the update that contains the call can arrive slightly after the hook. The hook waits up to 1 s for it; if it never arrives, the call goes through unchecked.

## Install

Packaged as `pkgs.omp-extensions.ask-preamble` (flake output `omp-extension-ask-preamble`). Enable it through the Home Manager module; OMP loads it on the next session start:

```nix
programs.oh-my-pi.extensions = [pkgs.omp-extensions.ask-preamble];
```

## Smoke test

`ask` needs a UI, so it is missing in `--print` and plain `--mode rpc`. Use `--mode rpc-ui`, load the extension with `-e`, and answer `extension_ui_request` frames with `{"type":"extension_ui_response","id":...,"cancelled":true}`. Send a `prompt` that makes the model call a tool first (for example read a file), then explain options and ask. Expected with Opus 5.5: the `ask` after the tool result is blocked ("Blocked:"), the run ends with a long text-only message, a second run starts with the `ask-preamble-continue` message, and its `ask` opens a `select` request.

## Layout

- `index.ts`: the extension: tracks the streamed message, registers the `tool_call` check and the `agent_end` continuation.
- `shared/preamble.ts`: pure logic (reply text before a call, block reason, the `AskGate` state across runs), tested.
- `types/omp.d.ts`: minimal types for the parts of OMP's extension API used here. OMP provides `@oh-my-pi/pi-coding-agent` at runtime, so it is not installed.

## Develop

`nix build .#omp-extension-ask-preamble` runs the tests. Type checks, from this folder:

```sh
bun install
bun run typecheck
bun run test
```
