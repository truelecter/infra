# gsd-omp

[`tchivs/gsd-omp`](https://github.com/tchivs/gsd-omp) packaged for Nix: the third-party GSD plugin for Oh My Pi. GSD itself doesn't support OMP (open-gsd/gsd-core#3037, not planned); this plugin projects GSD's extension, agents, and skills into an OMP config directory.

- `default.nix`: `buildNpmPackage` of the tagged release, with Node 24 (the CLI's minimum). Flake output `gsd-omp`.
- `gsd-core-1.14.0.patch`: pins `@opengsd/gsd-core` to 1.14.0 instead of upstream's 1.12.0, so OMP handles `.planning/` the same way as other agents running GSD 1.14.0.

## Use in OMP

`pkgs.omp-extensions.gsd` (flake output `omp-extension-gsd`, see `../../omp-extensions/default.nix`) runs `gsd-omp install --root $out` at build time and adds a `package.json` whose `omp.extensions` points at the generated `extensions/gsd-omp.ts`. The result is an OMP extension package: OMP loads the extension and discovers the sibling `agents/` and `skills/` directories, all from the Nix store, so there is no `gsd-omp install` step and no GC root to keep.

```nix
programs.oh-my-pi.extensions = [pkgs.omp-extensions.gsd];
```

The skills tell GSD where its agents are (`<root>/agents`), which is the same store path. Model routing is not part of the plugin: `task.agentModelOverrides` in the OMP settings maps each `gsd-*` agent to a model role.

Remove a previous imperative install first (`gsd-omp uninstall`), or OMP loads the extension twice.

## Update

1. Bump `version` and set `hash` and `npmDepsHash` to `lib.fakeHash`.
2. `nix build .#gsd-omp`, copy the `got:` hash for the source, build again for the npm deps.
3. If upstream's `package-lock.json` changed, regenerate the patch: in a checkout of the new tag, `npm install @opengsd/gsd-core@<version> --save-exact --package-lock-only --ignore-scripts`, then `git diff > gsd-core-<version>.patch`.
