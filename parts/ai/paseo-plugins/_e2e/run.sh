# Runs the Paseo plugin end-to-end suite against an isolated daemon. Arguments go to
# `playwright test`. Wrapped by default.nix (writeShellApplication: bash, set -euo pipefail),
# which sets PASEO_E2E_PASEO, PASEO_E2E_DAEMON_NODE, PASEO_E2E_DEFAULT_SUITE,
# PASEO_E2E_NODE_MODULES, and PASEO_E2E_PLUGIN_PATHS.
#
# PASEO_E2E_SUITE=<dir>               run the specs from a checkout of the _e2e folder instead
# PASEO_E2E_PLUGIN_OVERRIDES="id=path ..."   load a plugin from another folder; an empty path
#                                     leaves the plugin out
# PASEO_E2E_ROOT=<dir>                use this (new or empty) folder as the temp root (CI uploads it)
# PASEO_E2E_KEEP=<anything>           keep the temp root (daemon home, logs, report) after a pass

suite="${PASEO_E2E_SUITE:-$PASEO_E2E_DEFAULT_SUITE}"
suite="$(cd "$suite" && pwd)"
cli="$PASEO_E2E_PASEO/bin/paseo"

plugins="$(cat "$PASEO_E2E_PLUGIN_PATHS")"
for override in ${PASEO_E2E_PLUGIN_OVERRIDES:-}; do
  id="${override%%=*}"
  path="${override#*=}"
  # A typo would leave the plugin in and make a "fails without its plugin" check pass.
  if ! jq -e --arg id "$id" 'has($id)' <<<"$plugins" >/dev/null; then
    echo "paseo-plugins-e2e: unknown plugin in PASEO_E2E_PLUGIN_OVERRIDES: $id (known: $(jq -r 'keys | join(" ")' <<<"$plugins"))" >&2
    exit 1
  fi
  if [ -z "$path" ]; then
    plugins="$(jq --arg id "$id" 'del(.[$id])' <<<"$plugins")"
  else
    plugins="$(jq --arg id "$id" --arg path "$(cd "$path" && pwd)" '.[$id] = $path' <<<"$plugins")"
  fi
done

# Keep the path short: Unix socket paths (backlog) are limited to 104 bytes on macOS.
if [ -n "${PASEO_E2E_ROOT:-}" ]; then
  mkdir -p "$PASEO_E2E_ROOT"
  if [ -n "$(ls -A "$PASEO_E2E_ROOT")" ]; then
    echo "paseo-plugins-e2e: PASEO_E2E_ROOT=$PASEO_E2E_ROOT is not empty" >&2
    exit 1
  fi
  root="$(cd "$PASEO_E2E_ROOT" && pwd)"
else
  root="$(mktemp -d /tmp/paseo-e2e.XXXXXX)"
fi
home="$root/paseo"
fake_home="$root/home"
daemon_pid=""

cleanup() {
  local status=$?
  if [ -n "$daemon_pid" ]; then
    kill -TERM "$daemon_pid" 2>/dev/null || true
    wait "$daemon_pid" 2>/dev/null || true
  fi
  if [ "$status" -eq 0 ] && [ -z "${PASEO_E2E_KEEP:-}" ]; then
    rm -rf "$root"
  else
    echo "paseo-plugins-e2e: kept $root (daemon log paseo/daemon.log, Playwright report report/)" >&2
  fi
}
trap cleanup EXIT
mkdir -p "$home" "$fake_home"

port="$(node -e 'const s = require("net").createServer(); s.listen(0, "127.0.0.1", () => { console.log(s.address().port); s.close(); });')"
if [ "$port" = 6767 ]; then
  echo "paseo-plugins-e2e: got port 6767, the default daemon's; try again" >&2
  exit 1
fi

jq -n --arg listen "127.0.0.1:$port" --argjson plugins "$plugins" '{
  version: 1,
  daemon: {listen: $listen, relay: {enabled: false}},
  pluginsEnabled: true,
  # Only the mock provider (development mode) is used; the real ones would start their CLIs.
  agents: {providers: ({} | .claude.enabled = false | .codex.enabled = false | .copilot.enabled = false
    | .omp.enabled = false | .opencode.enabled = false | .pi.enabled = false)},
  features: {
    webUi: {enabled: true},
    # Speech provider setup delays the daemon start by close to a minute.
    dictation: {enabled: false},
    voiceMode: {enabled: false}
  },
  plugins: ($plugins | map_values({source: "directory", path: ., enabled: true}))
}' >"$home/config.json"

# The daemon is Paseo's supervisor from the server package, started directly in development mode:
# `bin/paseo-server` forces production, which hides the `mock` agent provider, and `paseo daemon
# start` can't find the server package in this build (`@getpaseo/server`'s main file is not in its
# traced closure). HOME is a temp folder so nothing reaches ~/.paseo or ~/.local/share; the
# backlog socket folder is set explicitly as well. tailscale-listener listens on IPv6 loopback
# (the daemon is on 127.0.0.1) and adds made-up names, so nothing leaves the machine.
echo "paseo-plugins-e2e: starting daemon on 127.0.0.1:$port, home $home" >&2
env HOME="$fake_home" PASEO_HOME="$home" PASEO_NODE_ENV=development PASEO_CLI="$cli" \
  PASEO_BACKLOG_DIR="$root/backlog" \
  PASEO_TAILSCALE_ADDRESS="::1" PASEO_TAILSCALE_HOSTNAMES="e2e-host.e2e-tailnet.ts.net" \
  "$PASEO_E2E_DAEMON_NODE" "$PASEO_E2E_PASEO/lib/paseo/packages/server/dist/scripts/supervisor-entrypoint.js" \
  </dev/null >"$root/daemon-supervisor.log" 2>&1 &
daemon_pid=$!

# Ready once the worker listens (paseo.pid gets `listen`) and every plugin has started or failed.
# About a minute on an idle machine, mostly beautiful-chat's server; three on a busy one.
start=$SECONDS
deadline=$((SECONDS + 600))
until jq -e '.listen' "$home/paseo.pid" >/dev/null 2>&1 &&
  HOME="$fake_home" "$cli" plugin ls --json --home "$home" 2>/dev/null |
  jq -e 'length > 0 and all(.[]; .status == "running" or .status == "error" or .enabled == false)' >/dev/null; do
  if ! kill -0 "$daemon_pid" 2>/dev/null; then
    echo "paseo-plugins-e2e: the daemon exited during startup" >&2
    tail -n 40 "$root/daemon-supervisor.log" >&2
    exit 1
  fi
  if [ "$SECONDS" -ge "$deadline" ]; then
    echo "paseo-plugins-e2e: the daemon or its plugins did not start within 600 s" >&2
    exit 1
  fi
  sleep 1
done
echo "paseo-plugins-e2e: daemon ready after $((SECONDS - start)) s" >&2
HOME="$fake_home" "$cli" plugin ls --home "$home" >&2

server_id="$(jq -r .serverId "$home/paseo.pid")"

export NODE_PATH="$PASEO_E2E_NODE_MODULES${NODE_PATH:+:$NODE_PATH}"
export PASEO_E2E_ROOT="$root" PASEO_E2E_HOME="$home" PASEO_E2E_FAKE_HOME="$fake_home"
export PASEO_E2E_PORT="$port" PASEO_E2E_SERVER_ID="$server_id"
export PASEO_E2E_BACKLOG_DIR="$root/backlog" PASEO_E2E_CLI="$cli"

cd "$suite"
playwright test --config "$suite/playwright.config.ts" "$@"
