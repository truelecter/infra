# gsd-omp

[`tchivs/gsd-omp`](https://github.com/tchivs/gsd-omp) packaged for Nix: the third-party GSD plugin for Oh My Pi. GSD itself doesn't support OMP (open-gsd/gsd-core#3037, not planned); this plugin projects GSD's extension, agents, and skills into an OMP config directory.

- `default.nix`: `buildNpmPackage` of the tagged release, with Node 24 (the CLI's minimum). Flake output `gsd-omp`. Its `postPatch` puts this Node first in the extension's Node lookup (`resolveNodeBinary` in `src/extension.cjs`, right after the `GSD_NODE_BIN`/`OMP_NODE_BIN` overrides), so GSD's hooks, graphify worker, and `gsd-tools` (`xd://gsd_invoke`) always run under Node. OMP is a single-file Bun executable: without Node on `PATH` upstream falls back to `process.execPath`, which is OMP itself, and every Write, Edit, and Bash call in a GSD project then starts a full OMP session per hook that gets killed after 5 seconds.
- `gsd-core-1.14.0.patch`: pins `@opengsd/gsd-core` to 1.14.0 instead of upstream's lock (1.15.0 as of 1.0.25), so OMP handles `.planning/` the same way as other agents running GSD 1.14.0.

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
3. If upstream's `package-lock.json` changed, regenerate the patch: in a checkout of the new tag, `npm_config_userconfig=/dev/null npm install @opengsd/gsd-core@<version> --save-exact --package-lock-only --ignore-scripts --registry=https://registry.npmjs.org/`, then `git diff > gsd-core-<version>.patch`. The public registry and the empty user config keep a private npm mirror's URLs out of the lock.
4. If the `postPatch` substitution fails, upstream changed `resolveNodeBinary`; adapt it so the store Node still comes before any `PATH` lookup.
