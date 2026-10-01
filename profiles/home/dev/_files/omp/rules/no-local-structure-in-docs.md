---
description: Do not mention the local workspace layout, relations between workspaces, or personal tooling in documentation and code comments
alwaysApply: true
---

# No local workspace structure in docs

My folders are a personal setup: several standalone repositories grouped into workspace directories (for example a workspace root with `projects/*`, a shared `nix/` flake, sibling repos). Other people work with each project as a standalone repo and never see that structure.

## Rules

- Do **not** reference the workspace root, paths outside the current repository, sibling repositories, or how repositories relate to each other in my workspaces, in documentation files (README.md, AGENTS.md, CONTRIBUTING.md, etc.) or in code comments.
- Write paths relative to the individual repository root, as if it were checked out on its own.
- Do not mention nix, `nix develop`, direnv, or other personal tooling in documentation, unless the repository itself ships that tooling (its own `flake.nix` or `.envrc`).

## Examples

```markdown
<!-- BAD -->
Run tests from `projects/acme/billing-api`:
cd projects/acme/billing-api && npm test

<!-- GOOD -->
Run tests from the repo root:
npm test
```

```typescript
// BAD: shared config lives in projects/acme/dashboards
// GOOD: shared config lives in the dashboards/ folder
```
