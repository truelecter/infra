# caveman (OMP extension)

Terse "caveman" replies in [Oh My Pi](https://github.com/can1357/oh-my-pi) (`omp`), with four modes: `full` (standard caveman), `high`, `ultracave`, and `off`. The default comes from `OMP_CAVEMAN_MODE`; `/caveman <mode>` switches the current session.

## Modes

| Mode        | What it asks for                                                                                                                                                      |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `full`      | Standard caveman: answer first, no ceremony, articles optional, fragments fine, one idea per sentence, short words, standard acronyms only.                           |
| `high`      | Fragments always, no articles or copulas, each fact once, one or two lines for a simple question; keeps "because", "so", "then"; no invented abbreviations or arrows. |
| `ultracave` | Maximum compression: one word when one word is enough, abbreviations (DB, auth, config, fn, impl), `->` for causality.                                                |
| `off`       | Nothing added.                                                                                                                                                        |

Every mode limits scope (answer only what was asked; after tool work, the outcome and what the user must do), bans first-person narration of the work and recaps, keeps code, commands, paths, errors, negations, and numbers exact, and switches to normal prose for code, commits, PRs, docs, security warnings, irreversible steps, order-sensitive steps, questions to the user, and a confused user. The texts are in `shared/modes/` (`<mode>.md` plus `exceptions.md`) and the per-turn reminders in `shared/modes.ts`.

## Why it works this way

Claude Opus 5.5 ignores a caveman rule in the system prompt: it keeps its report style ("I updated ... I also built ... I didn't run ...") and answers the whole topic instead of the question. Upstream caveman found the same (JuliusBrussee/caveman issues #1125, #1136): what works is a short reminder next to each user message that limits scope, not only wording. Measured on `claude-opus-5-5` (Bedrock, thinking `high`) through `omp -p`, 6 dev questions and 4 read-only repo questions, 2 runs each, median words of prose per reply: rule in the system prompt only, 235 on questions and 163 on repo tasks; rule plus reminder, 42 and 75.

So the rules travel with the user turns, through OMP's `context` event (before every provider request, model-only, never written to the session):

- A mode's first turn (the first turn of the session, after a switch, or the first visible turn after a compaction) gets its full rules and its reminder; every later turn in that mode gets the reminder (about 100 tokens); the turn that turns it off gets one "write normal prose" notice.
- Each turn's text depends only on the turns before it, so earlier turns render the same bytes on every request and the prompt cache keeps matching. A switch costs no cache.
- Only human turns count: auto-continues and other agent-made user turns (`attribution: "agent"`, synthetic) get nothing.
- Subagents get the default mode's rules and reminder once, on their task message. `/caveman` doesn't reach them.

## Use

- `/caveman`: shows the current mode.
- `/caveman full|high|ultracave|off` (aliases `caveman`, `standard`, `ultra`, `none`, `nothing`): switches from the next message on. The switch is saved in the session (custom entry `caveman-mode`), so it survives a resume.
- "stop caveman" or "normal mode" in a message turns it off from that message until the next `/caveman` switch.

## Install

Packaged as `pkgs.omp-extensions.caveman` (flake output `omp-extension-caveman`). Enable it and set the default through the Home Manager module; OMP loads it on the next session start:

```nix
programs.oh-my-pi = {
  extensions = [pkgs.omp-extensions.caveman];
  environment.OMP_CAVEMAN_MODE = "ultracave"; # full (when unset), high, ultracave, off
};
```

## Layout

- `index.ts`: the extension (`context` hook, `/caveman` command, reading the mode texts).
- `shared/modes.ts`: mode names, reminders, the mode at each turn, which turn gets which text; tested.
- `shared/modes/*.md`: the rules per mode and the shared exceptions.
- `types/omp.d.ts`: minimal types for the OMP APIs used.

## Develop

`nix build .#omp-extension-caveman` runs the tests. Type checks, from this folder:

```sh
bun install
bun run typecheck
bun run test
```
