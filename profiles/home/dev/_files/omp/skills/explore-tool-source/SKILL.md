---
name: explore-tool-source
description: Read the source code of a tool the user runs (agent harnesses, CLIs, apps such as OMP, Paseo, OpenCode) at the exact version installed on this machine. Use when you need to know how an installed tool really behaves (config keys, plugin or extension APIs, internals, bugs), when its docs are unclear or missing, or before writing a plugin or extension for it.
---

# Explore a tool's source at the installed version

Installed tools are usually compiled or bundled (Nix store, app bundles, npm builds). Don't dig through the installed package for source code; read the upstream repository at the tag that matches the installed version.

## Steps

1. **Find the installed version**, e.g. `<tool> --version`. If the tool is not on `PATH`, find its binary (examples below) or ask.
2. **Find the repository clone** at `~/.cache/agent-exploration-repos/<name>`, where `<name>` is the repository name.
   - Missing: `git clone https://github.com/<owner>/<repo> ~/.cache/agent-exploration-repos/<repo>`
   - Present: `git -C ~/.cache/agent-exploration-repos/<repo> fetch --tags --force`
   - A shallow clone has no tags; convert it with `git -C <clone> fetch --unshallow --tags`.
3. **Check out the matching tag**, usually `v<version>`: `git -C <clone> checkout --quiet v<version>`. List candidates with `git -C <clone> tag --list '*<version>*'` if the name differs. If no tag matches, say so and use the closest one, stating which.
4. **Read and search the clone** with your normal file tools. Cite paths relative to the repository root, plus the tag, when you report findings.

Clones are shared between sessions. Only fetch and check out tags there; never commit, edit, or leave local changes. If another session may be using the clone at a different tag, use a worktree instead: `git -C <clone> worktree add ~/.cache/agent-exploration-repos/<repo>@v<version> v<version>`.

## Examples

| Tool           | Repository         | Version command                      | Tag              |
| -------------- | ------------------ | ------------------------------------ | ---------------- |
| OMP (Oh My Pi) | `can1357/oh-my-pi` | `omp --version` -> `omp/18.3.2`      | `v18.3.2`        |
| Paseo          | `getpaseo/paseo`   | `paseo --version` -> `0.10.0-beta.1` | `v0.10.0-beta.1` |

- **OMP:** `omp` comes from the Nix store. If it is not on `PATH`, use `/etc/profiles/per-user/$(id -un)/bin/omp`.
- **Paseo:** the CLI is not on `PATH`; it is at `~/Applications/Home Manager Apps/Paseo.app/Contents/Resources/bin/paseo`. The desktop app and its bundled daemon have the same version.

Other tools follow the same pattern: `opencode --version` -> `anomalyco/opencode` at `v<version>`.
