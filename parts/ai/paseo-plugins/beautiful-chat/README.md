# Beautiful Chat

A Paseo plugin that redraws reasoning, todo updates, and tool calls from Oh My Pi (OMP) and leaves everything else to Paseo. Prompts, assistant replies, errors, approvals, and images all keep Paseo's own rendering.

It began as a vendored fork of [ABorakati/beautiful-chat](https://github.com/ABorakati/beautiful-chat) and has since been cut down to the cards below.

## Thinking

Each `reasoning` item becomes a collapsible Thinking card. The reasoning text is split into steps on blank lines, and each step sits on a step rail that grows one tick at a time while the model streams. The step being written is marked active, and finished steps get a check mark. The header shows the step count and an approximate token count.

A fenced code block in the reasoning text (a line of three backticks with an optional language tag, then the code, then a closing fence) becomes its own step, rendered as a code block with line numbers, a copy button, and Shiki highlighting. The daemon side of the plugin does the highlighting through the `highlight.tokens` RPC. A fence still open while the text streams is drawn as code up to the end of the text.

Reasoning cards open on their own, both while running and once finished.

## Checklist

Each `todo` item becomes one folded line that says what the update changed, for example `Done Wave 4` and `Started Wave 5`, with the progress count. Pressing the line opens a progress bar and the full checklist on the same step rail.

Paseo hands plugins only the list, not the change, so `client/todo-history.ts` works the change out again against the list drawn before it, per agent. One call that finishes a task and starts the next makes the host file two rows with the same list, and only the first is drawn. A row with no earlier list on screen (the agent's first list, or history not loaded yet) says `Checklist` and names the running task.

## Tool activity

A turn's tool calls fold into one line such as `Ran 2 commands · Read 2 files · Edited 1 file · Used 6 tools`. Pressing it lists each call as a compact row: an icon for the kind of tool, its name, a one-line preview of the arguments (the command, the file path, the query), a status mark, and a chevron. Pressing a row opens its output, diff, or content; shell output and diffs are highlighted. A turn with a single call draws just that row. The **Combine tool calls** setting turns the folding off, and then every call draws as its own row.

A turn that has reasoning is not folded: each tool call draws as its own compact row, in place, since the reasoning already structures the turn. Reasoning that comes after some calls of a folded turn ends that fold, and the calls after it draw as rows.

A transformer sees only the item, not the agent or the row time, so `client/activity-store.ts` works the turns out from the order the host passes items in, with user prompts and assistant replies as boundaries. Prompts and replies themselves stay with Paseo. That order is shared by every agent the app draws, so while other agents stream at the same time their items can steer this one's grouping: another agent's reasoning makes this agent's calls draw as rows, another agent's reply splits a fold in two, and a call can land in another agent's fold and not show in its own chat. Turning **Combine tool calls** off avoids the last two, since every call then draws in its own chat. Paseo's plugin API has no agent or turn id in the transformer input (getpaseo/paseo 0.11.0-beta.5 and `main` as of 2026-10-06), and no upstream issue asks for one yet; renderers do get the agent id.

Every call of a folded run still gets its own timeline item: the first draws the summary and the rest draw nothing. So the setting redraws cards already on screen, without the host transforming the items again.

## Questions

An answered `ask` call draws as a card with the question as the header and the answer below it. OMP passes only the question and the answer, so the options that were offered are not shown. An `ask` still waiting for an answer stays with Paseo.

## Times

Every card shows when its item arrived at the right of its header line: the Thinking card when the reasoning started, the checklist when the list was set, the tool summary line and each compact tool row when the call started, and the question card when it was asked. The wording follows Paseo's own message times (`client/time.ts` mirrors its `formatMessageTimestamp`): only the time on the same day (`22:11` or `10:11 PM`, following the system's 12/24-hour setting), the weekday and time for the six days before (`Wednesday 22:11`), and the date and time before that. Paseo hands each renderer the row's time as `timestamp`. Rows listed inside an opened summary show no time, because the run keeps only the calls, not their rows' times.

## Settings

**Settings -> Plugins -> Beautiful Chat -> Chat presentation** has three settings. **Text size** (Small, Default, Large, or Larger) scales every font size and line height in the plugin's own cards and leaves paddings, icons, and corners alone. **Show times** (on by default) shows each card's time. **Combine tool calls** (on by default) folds a turn's tool calls into one summary line; off draws every call as its own row. Cards on screen follow every change at once. The settings are saved in the window's local storage. Paseo's Appearance font settings cover everything else; a plugin cannot read them.

## Develop

Install dependencies, then run the type check and the tests:

```sh
bun install
bun run typecheck
bun run test
```

With a local checkout linked into Paseo, `paseo plugin reload beautiful-chat` picks up each edit and `paseo plugin logs beautiful-chat` shows its output.

## Project structure

```text
beautiful-chat/
  paseo-plugin.json            # Manifest: id and Paseo requirement
  index.client.tsx             # Transformers and renderers for reasoning, todo, and tool call items
  index.server.ts              # Daemon-side Shiki highlighter behind the highlight.tokens RPC
  shared/
    contracts.ts               # Reasoning and checklist data types
    highlight-rpc.ts           # highlight.tokens contract
  client/
    renderers.tsx              # Timeline item to card mapping, reasoning step and fence splitting
    highlight.ts               # Client hook for the highlight RPC
    todo-history.ts            # What each todo update changed, worked out per agent
    tool-kind.ts               # Tool call to kind, icon, label, preview, and summary wording
    activity-store.ts          # Groups a turn's tool calls into runs, in transform order; what each call's item draws
    collapse.ts                # Which cards open on their own
    time.ts                    # A card's time, worded like Paseo's message times
    preferences.ts             # Text size, Show times, Combine tool calls, and collapse settings, a small store saved to local storage
    settings-page.tsx          # Chat presentation settings screen (Text size, Show times, Combine tool calls)
    components/
      reasoning-trace.tsx      # Thinking card
      task-list.tsx            # Checklist card
      todo-summary.tsx         # Folded checklist header line
      syntax-highlight.tsx     # Code block used inside thinking steps and tool details
      activity-card.tsx        # Folded tool activity line and compact tool rows
      ask-card.tsx             # Answered question card
      card-time.tsx            # The time on a card's header line
      theme-tokens.ts          # Colours derived from the Paseo theme
      glyph.tsx                # Small icons
      selection.ts             # Text selection style helpers
```

## License

MIT
