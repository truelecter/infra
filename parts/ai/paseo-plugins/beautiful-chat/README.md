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

A turn's tool calls fold into one line such as `Ran 2 commands · Read 2 files · Edited 1 file · Used 6 tools`. Pressing it lists each call as a compact row: an icon for the kind of tool, its name, a one-line preview of the arguments (the command, the file path, the query), a status mark, and a chevron. Pressing a row opens its output, diff, or content; shell output and diffs are highlighted. A turn with a single call draws just that row.

A turn that has reasoning is not folded: each tool call draws as its own compact row, in place, since the reasoning already structures the turn. Reasoning that comes after some calls of a folded turn ends that fold, and the calls after it draw as rows.

A transformer sees only the item, not the agent or the row time, so `client/activity-store.ts` works the turns out from the order the host passes items in, with user prompts and assistant replies as boundaries. Prompts and replies themselves stay with Paseo. Two chats streaming at the same time can interleave and, rarely, merge their calls into one line.

## Questions

An answered `ask` call draws as a card with the question as the header and the answer below it. OMP passes only the question and the answer, so the options that were offered are not shown. An `ask` still waiting for an answer stays with Paseo.

## Settings

**Settings -> Plugins -> Beautiful Chat -> Chat presentation** has one setting, **Text size**: Small, Default, Large, or Larger. It scales every font size and line height in the plugin's own cards and leaves paddings, icons, and corners alone. Cards on screen follow the change at once. Paseo's Appearance font settings cover everything else; a plugin cannot read them.

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
    activity-store.ts          # Groups a turn's tool calls into runs, in transform order
    collapse.ts                # Which cards open on their own
    preferences.ts             # Text size and collapse settings, a small store saved to local storage
    settings-page.tsx          # Chat presentation settings screen (Text size)
    components/
      reasoning-trace.tsx      # Thinking card
      task-list.tsx            # Checklist card
      todo-summary.tsx         # Folded checklist header line
      syntax-highlight.tsx     # Code block used inside thinking steps and tool details
      activity-card.tsx        # Folded tool activity line and compact tool rows
      ask-card.tsx             # Answered question card
      theme-tokens.ts          # Colours derived from the Paseo theme
      glyph.tsx                # Small icons
      selection.ts             # Text selection style helpers
```

## License

MIT
