---
description: Do not mention the local workspace layout, relations between workspaces, or personal tooling in documentation and code comments
alwaysApply: true
---

# No local workspace structure in docs

My repositories sit in personal workspace folders (a root with `projects/*`, a shared `nix/` flake, sibling repos). Others check out each repo on its own. In documentation files (README.md, AGENTS.md, CONTRIBUTING.md, ...) and code comments:

- Don't reference the workspace root, paths outside the repository, sibling repositories, or how repositories relate to each other. Write paths relative to the repository root, for example "the `dashboards/` folder", not `projects/acme/dashboards`.
- Don't mention nix, `nix develop`, direnv, or other personal tooling unless the repository ships it (its own `flake.nix` or `.envrc`).
