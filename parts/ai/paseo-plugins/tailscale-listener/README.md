# tailscale-listener

Server-only Paseo plugin that makes a loopback-only daemon reachable over Tailscale, without changing `daemon.listen`.

It listens on this machine's Tailscale IPv4 address (100.64.0.0/10) on the daemon's port and forwards raw TCP to the daemon listener, so HTTP and WebSocket traffic pass through unchanged. The daemon keeps listening on `127.0.0.1`, so local clients keep working and workspace services keep binding to `127.0.0.1`.

- Upstream is resolved like the daemon does: `PASEO_LISTEN`, then `daemon.listen` in `$PASEO_HOME/config.json`, then `127.0.0.1:6767`. Unix sockets are supported.
- Does nothing when the daemon already listens on a non-loopback address.
- Polls every 15 s: binds once Tailscale connects, rebinds when the address changes, and closes the listener when Tailscale goes away.
- Adds the machine's MagicDNS names (e.g. `host.tailnet.ts.net` and `host`) to `daemon.hostnames`, so clients can connect by name. Names come from a reverse lookup of the Tailscale IP against `100.100.100.100`; the change is written with `paseo daemon config set` (the CLI from `PASEO_CLI`, else `paseo` on `PATH`), which validates, saves, and reloads the daemon. Names are only added, never removed. Rechecked on every bind and every 5 minutes; the daemon config is only touched when the names change.
- The first bind happens while the daemon is still loading plugins, before it accepts CLI connections, so that first save reaches `config.json` but not the running daemon (the CLI answers `applied: false`). The plugin then saves the same list again every 10 seconds until the daemon applies it, and logs `Applied daemon.hostnames to the running daemon.`
- Password auth is still enforced by the daemon. Without a password every tailnet device gets full access; set one with `paseo daemon set-password`.
- For tests without Tailscale, two variables in the daemon's environment replace the lookups: `PASEO_TAILSCALE_ADDRESS` is the address to listen on (the end-to-end suite uses `::1`), and `PASEO_TAILSCALE_HOSTNAMES` is a comma-separated list of names to add instead of the MagicDNS lookup.

## Develop

Installed through `programs.paseo.plugins.tailscale-listener` (the parts/ai/homeModules/paseo.nix Home Manager module). To work on it without a switch, run `paseo-plugin-dev link tailscale-listener` from your checkout: Paseo then loads this folder, `paseo plugin reload tailscale-listener` picks up each edit, and `paseo plugin logs tailscale-listener` shows its output. `paseo-plugin-dev restore tailscale-listener` goes back to the installed build. See `parts/ai/AGENTS.md`.

```sh
nix shell --inputs-from "$(git rev-parse --show-toplevel)" latest#bun \
  -c sh -c 'bun install --frozen-lockfile && bun run typecheck && bun run test'
rm -rf node_modules
nix build .#paseo-plugin-tailscale-listener -L
```

Requires `pluginsEnabled: true` in the daemon's `config.json`.

On the phone: Tailscale connected, then Paseo → Settings → Add host → Direct connection,
host = the MagicDNS name (or Tailscale IP), port = `6767`, SSL off.
