# gsd-omp

[`tchivs/gsd-omp`](https://github.com/tchivs/gsd-omp) packaged for Nix: the third-party GSD plugin for Oh My Pi. GSD itself doesn't support OMP (open-gsd/gsd-core#3037, not planned); this plugin projects GSD's extension, agents, and skills into an OMP config directory. The source is our fork, [`truelecter/gsd-omp`](https://github.com/truelecter/gsd-omp), branch `local` (see "Fork").

- `default.nix`: `buildNpmPackage` of a pinned commit of the fork's `local` branch, with Node 24 (the CLI's minimum). Flake output `gsd-omp`. Its `postPatch` puts this Node first in the extension's Node lookup (`resolveNodeBinary` in `src/extension.cjs`, right after the `GSD_NODE_BIN`/`OMP_NODE_BIN` overrides), so GSD's hooks, graphify worker, and `gsd-tools` (`xd://gsd_invoke`) always run under Node. OMP is a single-file Bun executable: without Node on `PATH` upstream falls back to `process.execPath`, which is OMP itself, and every Write, Edit, and Bash call in a GSD project then starts a full OMP session per hook that gets killed after 5 seconds.
- GSD Core comes from upstream's `package-lock.json` (`@opengsd/gsd-core` 1.15.0 as of 1.0.25), with no pin of our own.

## Use in OMP

`pkgs.omp-extensions.gsd` (flake output `omp-extension-gsd`, see `../../omp-extensions/default.nix`) runs `gsd-omp install --root $out` at build time and adds a `package.json` whose `omp.extensions` points at the generated `extensions/gsd-omp.ts`. The result is an OMP extension package: OMP loads the extension and discovers the sibling `agents/` and `skills/` directories, all from the Nix store, so there is no `gsd-omp install` step and no GC root to keep.

```nix
programs.oh-my-pi.extensions = [pkgs.omp-extensions.gsd];
```

The skills tell GSD where its agents are (`<root>/agents`), which is the same store path. They and the agents read GSD Core's workflows, references, and templates from the projected `<root>/gsd-core/` copies (command names in the `/gsd-<cmd>` spelling), while `gsd-tools.cjs` runs from the GSD Core package. Model routing is not part of the plugin: `task.agentModelOverrides` in the OMP settings maps each `gsd-*` agent to a model role.

Remove a previous imperative install first (`gsd-omp uninstall`), or OMP loads the extension twice.

## Fork

`local` is an upstream release tag plus our branches, each kept ready to merge upstream. The fork's `FORK.md` lists every commit on `local` with its upstream PR and when to drop it: today `feat/execute-phase-todo` (OMP's `todo` in `/gsd-execute-phase`, tchivs/gsd-omp#73), `fix/execute-phase-skill-dispatch` (the executor dispatch contract in the projected `gsd-execute-phase` skill, tchivs/gsd-omp#74), `fix/skip-compact-agents` (no `.compact.md` agents shadowing the full ones, tchivs/gsd-omp#75 by another contributor), and `fix/project-core-docs` (GSD Core's `gsd-core/` documents projected with `/gsd-<cmd>` instead of the legacy `/gsd:<cmd>`, no upstream PR).

## Update

1. In a checkout of the fork, rebase `local` onto the new upstream tag (`git rebase --onto v<new> v<old> local`), update `FORK.md` (see "Move to a newer upstream" there), and force-push it.
2. Set `version` to the new tag, `rev` to the new `local` commit, and `hash` and `npmDepsHash` to `lib.fakeHash`.
3. `nix build .#gsd-omp`, copy the `got:` hash for the source, build again for the npm deps.
4. Check the `@opengsd/gsd-core` version in the new tag's `package-lock.json`: OMP runs that GSD on `.planning/`, so other agents working in the same projects should run a compatible one.
5. If the `postPatch` substitution fails, upstream changed `resolveNodeBinary`; adapt it so the store Node still comes before any `PATH` lookup.
