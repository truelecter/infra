# nix-settings-notice (OMP extension)

Tells the user when [Oh My Pi](https://github.com/can1357/oh-my-pi) (`omp`) changes a setting it can't save because `~/.omp/agent/config.yml` is a read-only Home Manager link (`programs.oh-my-pi.mutableSettings = false`), and shows the Home Manager line that would make the change stick.

## Why

OMP saves settings changes from the settings UI, `/model`, and extensions to `config.yml`. When that file is a link into the Nix store, the save fails with only a log line (`Settings: save failed`): the change applies in memory and is gone when OMP exits, without the user noticing.

## What it does

- Watches every registered setting. When one changes and OMP's in-memory global layer no longer matches `config.yml` on disk, the change came from inside this OMP process; reloads after an external edit leave both equal.
- Only when `config.yml` is a link into `/nix/store/`, shows a warning such as:

  ```text
  modelRoles changed for this session only: ~/.omp/agent/config.yml is managed by Home Manager, so OMP can't save it. To keep it, change your Home Manager config:
    programs.oh-my-pi.settings.modelRoles.default = "anthropic/claude-sonnet-4-5:high";
  ```

  Record settings such as `modelRoles` list only the entries that changed. Each distinct change is shown once per session.
- With a writable `config.yml` it stays silent: OMP saves the change itself.

It can't see a change that has no effect, such as writing a key that a settings overlay (`OMP_CONFIG_FILES`) also sets: OMP only notifies listeners when the effective value changes. `omp config set` runs without extensions; with a read-only `config.yml` it fails on its own.

## Install

Packaged as `pkgs.omp-extensions.nix-settings-notice` (flake output `omp-extension-nix-settings-notice`). `programs.oh-my-pi` adds it by itself when `mutableSettings = false`, unless `settingsNotice = false`.

## Layout

- `index.ts`: the extension: the change listener, the read-only check, notices after `session_start`.
- `shared/notice.ts`: pure logic (changed leaves between the file and memory, Nix rendering, notice text), tested.
- `types/omp.d.ts`: minimal types for the OMP APIs used (`settings.onEffectiveChange`, `getGlobalSettings`, the registry's `all()`); OMP provides the modules at runtime.

## Develop

`nix build .#omp-extension-nix-settings-notice` runs the tests. Type checks, from this folder:

```sh
bun install
bun run typecheck
bun run test
```
