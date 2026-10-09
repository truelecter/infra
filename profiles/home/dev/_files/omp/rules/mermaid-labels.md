---
description: Quote Mermaid labels that contain characters the flowchart parser rejects; fires while a mermaid fence streams
condition:
  - '```mermaid[^`]*?[\[({>|]@'
  - '```mermaid[^`]*?\[(?!\s*"|[(\[/\\])[^\]\n]*?[()\[{|"]'
  - '```mermaid[^`]*?[-=.>ox]\|(?!\s*")[^|\n]*?[()"]'
  - '```mermaid[^`]*?(?<![@%])\{(?!\{|\s*")[^}\n]*?[()\[|"]'
scope: text
interruptMode: always
---

# Mermaid labels

Your Mermaid diagram does not parse, so it renders as a plain code block. Write it again with every node label and edge label that contains `@`, `(`, `)`, `[`, `]`, `{`, `}`, `|` or `"` wrapped in double quotes:

- Node: `A["@bot remember (pinned)"]`, not `A[@bot remember (pinned)]`.
- Edge: `A -->|"@bot remember / :pushpin:"| B`, not `A -->|@bot remember / :pushpin:| B`.
- A double quote inside a quoted label is `#quot;`: `A["say #quot;hi#quot;"]`.

Shape brackets stay outside the quotes: `P[("RDS Postgres")]`, `S(["start"])`, `H{{"hex"}}`.
