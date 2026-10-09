---
description: Nix dev shells: OMP already loads .envrc; use nix run/shell for missing tools and path: for flakes inside git repos
alwaysApply: true
---

# Nix dev shells

OMP loads the nearest `.envrc` for its shell, so the project's dev shell is already active: run project commands directly. Don't run `direnv allow` yourself; if direnv reports a blocked file, tell the user.

- A tool the dev shell doesn't provide: `nix run nixpkgs#<pkg> -- <args>` for a one-off, `nix shell nixpkgs#<pkg> -c <command>` to combine tools.
- No `.envrc` but a `flake.nix` with `devShells` (or `nix/flake.nix` up to the workspace root): `nix develop path:<dir> -c <command>`. Keep the `path:` prefix; without it a flake inside a git repository is copied with the whole repository and fails on untracked files.
- Starting a dev shell is slow: group related commands into one `nix develop <dir> -c bash -c '...'` call.
