---
description: Run commands inside the workspace's Nix dev shell (found via .envrc, flake.nix, or nix/); use nix run/shell for missing tools
alwaysApply: true
---

# Nix dev shells

Before running project commands (builds, tests, linters, package managers, project CLIs), find the dev shell, in this order:

1. **Already loaded:** if `DIRENV_DIR` is set, or the agent tool loads `.envrc` itself (OMP does), the shell is active. Run commands directly.
2. **`.envrc`:** find the nearest `.envrc` in the current directory or its parents.
   - If `direnv` is available, run `direnv exec <envrc-dir> <command>`. It applies the whole file (flake, `dotenv`, exports), not just the dev shell. If direnv reports the file is blocked, tell the user; don't run `direnv allow` yourself.
   - Otherwise, read it for a hint:
     - `use flake <ref>`: run `nix develop <ref> -c <command>`, resolving `$cdir`/`$PWD` to the `.envrc` directory.
     - `use flake` with no ref: use the flake next to the `.envrc`.
     - `use nix`: run `nix-shell --run '<command>'` in that directory.
     - `source_up`: keep going to the parent `.envrc`.
3. **No `.envrc`:** use `flake.nix` in the current directory if it defines `devShells`, otherwise `nix/flake.nix` in the current directory or a parent up to the workspace root: `nix develop path:<dir> -c <command>`. The `path:` prefix makes Nix copy only that folder; without it, a flake inside a git repository is copied with the whole repository and fails on untracked files.
4. **Nothing found:** run commands normally.

If a tool is missing and the dev shell doesn't provide it, use `nix run nixpkgs#<pkg> -- <args>` for a one-off, or `nix shell nixpkgs#<pkg> -c <command>` when combining tools.

Starting a dev shell is slow: group related commands into one `nix develop <dir> -c bash -c '...'` call instead of starting it for each command. Use `bash -c` whenever you need `cd`, pipes, or compound shell syntax inside the shell.
