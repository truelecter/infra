# system-health

Paseo plugin with a **System health** screen in the sidebar: what is slowing the Mac down, on demand. It exists because a slow laptop with many agents open is usually out of memory and swapping, not short on CPU, and Activity Monitor lists processes, not the apps and agent sessions they belong to.

macOS only: it samples `top`, `vm_stat`, `sysctl`, `ps`, and `lsof`, and the package (`pkgs.paseo-plugins.system-health`, `.#paseo-plugin-system-health`) exists only on Darwin systems. No sudo needed.

## What the screen shows

- **Memory**: wired, app, compressor (and how much it holds), cached files, and free memory as one bar of physical memory; memory pressure (`kern.memorystatus_vm_pressure_level`) and the share macOS considers available (`kern.memorystatus_level`); swap used of total (`vm.swapusage`); swap-in, swap-out, page-in, compression, and decompression rates over the sample, in pages per second.
- **CPU**: user, system, and idle share from `top`, and the load average against the core count.
- **Apps by memory**: the 15 biggest groups by footprint, with compressed memory, CPU, and process count. Tap a row for its biggest processes, and to quit an app.
- **Agent sessions**: each running `omp --mode rpc-ui` process with its Paseo agent (title, status, idle time), the processes it started (MCP servers, workers, shell commands), and its omp version. Sessions on an omp other than the installed one, and sessions with no live agent, are marked. Idle agents can be archived, and sessions without a live agent killed.
- **Long-running outliers**: processes up for a day or more with 500 MB or more, or 50 MB or more when detached (parent is launchd and the binary is outside an app bundle and the system folders, as a leftover `opencode serve` would be). Your own ones can be killed.

Every action asks for confirmation first.

## How it samples

One sample runs `vm_stat`, then `top -l 2 -s 2 -stats pid,mem,cmprs,cpu` together with `ps` and `sysctl`, then `vm_stat` again, so the rates and CPU shares cover the same two seconds. A sample takes about four seconds; screens open at the same time share it.

- Memory per process is `top`'s MEM, the physical footprint, which includes compressed and swapped-out memory. The RSS that `ps` reports undercounts apps that are mostly swapped out.
- Processes group under the outermost `.app` bundle in their executable path (`Cursor Helper (Renderer)` -> Cursor), or the nearest ancestor's bundle (a language server Cursor started), or their own name. Processes that renamed themselves (`Paseo Daemon`, Cursor's extension hosts) get their executable from `lsof`.
- Agent sessions and everything they started form the `Paseo agents` group instead of counting toward Paseo. A session is matched to its agent by the session id in its `--session` file, or in the session file it has open (`lsof`) when it was started without one. Agents come from Paseo's plugin API (`paseo.agents.list`, archived ones included).
- The installed omp is the one in `/etc/profiles/per-user/<user>/bin/omp`; without it, the newest running version counts as current.

The screen samples when it opens and on **Refresh**. **Auto** samples again every 5, 10, 30, or 60 seconds after the last sample came back, while the screen is open; the choice is a host setting (`~/.paseo/plugin-settings/system-health`), so it stays across restarts and devices. `top` costs some CPU itself, so a short interval is for watching a problem, not for leaving on.

## Actions

- **Archive agent** archives it through Paseo, the same as in the app.
- **Quit** asks the app to quit through AppleScript (`tell application <bundle> to quit`), the same as Quit in its menu; it may ask to save first, and macOS asks once to let Paseo control the app. Paseo itself can't be quit from here.
- **Kill** sends SIGTERM, only to a process of your user that still has the name the screen showed, and never to Paseo's own processes.

## Develop

Installed through `programs.paseo.plugins.system-health` (the parts/ai/homeModules/paseo.nix Home Manager module) on Darwin. To work on it without a switch, run `paseo-plugin-dev link system-health` from your checkout: Paseo then loads this folder, `paseo plugin reload system-health` picks up each edit, and `paseo plugin logs system-health` shows its output. `paseo-plugin-dev restore system-health` goes back to the installed build. See `parts/ai/AGENTS.md`.

```sh
nix shell --inputs-from "$(git rev-parse --show-toplevel)" latest#bun \
  -c sh -c 'bun install --frozen-lockfile && bun run typecheck && bun run test'
rm -rf node_modules
nix build .#paseo-plugin-system-health -L
```

The tests cover the parsers with real tool output and the grouping, session matching, and outlier rules with fixed process lists. The end-to-end spec (`_e2e/specs/system-health.spec.ts`) opens the screen against the real Mac and is skipped on Linux.

## Layout

- `index.server.ts`: RPC handlers for the screen; reads Paseo's agents.
- `index.client.tsx`: registers the screen and the sidebar item.
- `shared/health.ts`: Zod schemas, RPC contracts, and the refresh setting.
- `server/collect.ts`: runs the tools for one sample.
- `server/parse.ts`: parses their output.
- `server/model.ts`: groups processes into apps and agent sessions, finds outliers, and computes memory and rates.
- `server/actions.ts`: kill and quit.
- `client/health-screen.tsx`: the screen.
