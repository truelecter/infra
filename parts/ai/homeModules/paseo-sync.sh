# Applies the programs.paseo Home Manager settings to a Paseo home (~/.paseo), from activation.
#
#   paseo-hm-sync targets <desired.json>   print what each plugin link points at now, as JSON
#   paseo-hm-sync apply <desired.json>
#
# desired.json: {"settings": {...}, "plugins": {"<id>": {"path": "...", "enabled": true}}, "pluginRoot": "..."}
# Environment for apply: PASEO_HOME (default ~/.paseo), PASEO_CLI (Paseo CLI; without it, the
# running daemon is left alone), PASEO_HM_TARGETS_BEFORE (`targets` output taken before Home Manager
# relinked the plugins). Activation takes it right before linkGeneration, so a link repointed by hand
# (`paseo-plugin-dev link`) counts as the previous target too.
#
# Paseo keeps writing config.json itself, so it can't be a Home Manager link: `settings` is deep-merged
# into it (maps merge, lists and values are replaced), keys it doesn't set are kept. `plugins` entries
# are set from `plugins`, and entries under `pluginRoot` that are no longer configured are removed.
#
# A running daemon holds the plugin list in memory and writes all of it back on every plugin change,
# and `paseo daemon reload` doesn't touch plugins. So plugin changes go through the CLI first (install,
# enable, disable, reload), and config.json is written after them. A plugin whose configured path
# changed, or one that was removed, needs a Paseo restart; `paseo plugin uninstall` would delete its
# settings in ~/.paseo/plugin-settings, so it's never used.

mode=$1
desired=$2
home=${PASEO_HOME:-$HOME/.paseo}
config=$home/config.json
cli=${PASEO_CLI:-}

# What each plugin link points at (a store path, or a checkout).
targets() {
  jq -r '.plugins | to_entries[] | "\(.key)\t\(.value.path)"' "$desired" |
    while IFS=$'\t' read -r id link; do
      jq -n --arg id "$id" --arg target "$(readlink -f "$link" || printf '%s' "$link")" '{($id): $target}'
    done | jq -s 'add // {}'
}

case $mode in
targets)
  targets
  exit 0
  ;;
apply) ;;
*)
  echo "usage: paseo-hm-sync targets|apply <desired.json>" >&2
  exit 2
  ;;
esac

warn() { echo "paseo: $*" >&2; }

paseo() { "$cli" "$@" --home "$home"; }

# A plugin or daemon command; its output (including install's trust notice) only shows when it fails.
step() {
  local output
  if ! output=$(paseo "$@" 2>&1); then
    warn "\`paseo $*\` failed: $output"
  fi
}

mkdir -p "$home"

if [[ -e $config ]]; then
  if ! current=$(jq -e 'if type == "object" then . else error("not an object") end' "$config"); then
    warn "$config is not a JSON object; leaving it and the daemon alone"
    exit 0
  fi
else
  current='{"version": 1}'
fi

# A running plugin whose link target changed since before this activation is reloaded.
targets=$(targets)
previous=$(jq -e . <<<"${PASEO_HM_TARGETS_BEFORE:-}" 2>/dev/null || echo '{}')

settings_before=$(jq -c 'del(.plugins)' <<<"$current")

live=
if [[ -n $cli ]] && listing=$(paseo plugin ls --json 2>/dev/null); then
  live=$listing
fi

restart=()
if [[ -n $live ]]; then
  while IFS=$'\t' read -r id path enabled; do
    entry=$(jq -c --arg id "$id" 'map(select(.id == $id)) | first // empty' <<<"$live")
    if [[ -z $entry ]]; then
      step plugin install "$path" --id "$id"
      if [[ $enabled == false ]]; then
        step plugin disable "$id"
      fi
    elif [[ $(jq -r .path <<<"$entry") != "$path" ]]; then
      restart+=("$id")
    elif [[ $(jq -r .enabled <<<"$entry") != "$enabled" ]]; then
      if [[ $enabled == true ]]; then
        step plugin enable "$id"
      else
        step plugin disable "$id"
      fi
    elif [[ $enabled == true ]] &&
      [[ $(jq -r --arg id "$id" '.[$id] // ""' <<<"$previous") != $(jq -r --arg id "$id" '.[$id]' <<<"$targets") ]]; then
      step plugin reload "$id"
    fi
  done < <(jq -r '.plugins | to_entries[] | "\(.key)\t\(.value.path)\t\(.value.enabled)"' "$desired")

  # Managed plugins that are no longer configured: stop them now, drop them from config.json below.
  while read -r id; do
    step plugin disable "$id"
    restart+=("$id")
  done < <(jq -r --slurpfile desired "$desired" '
    $desired[0] as $d
    | .[] | select((.path | startswith($d.pluginRoot + "/")) and ($d.plugins[.id] == null) and .enabled)
    | .id' <<<"$live")

  # The CLI calls above rewrote config.json from the daemon's memory.
  if [[ -e $config ]]; then
    current=$(jq -e . "$config")
  fi
fi

next=$(jq --slurpfile desired "$desired" '
  $desired[0] as $d
  | (. * $d.settings)
  | .plugins = (
      ((.plugins // {})
        | with_entries(select((.value.path | startswith($d.pluginRoot + "/") | not) or $d.plugins[.key] != null)))
      + ($d.plugins | map_values({source: "directory", path, enabled}))
    )' <<<"$current")

if [[ $next != "$(jq . <<<"$current")" ]] || [[ ! -e $config ]]; then
  tmp=$(mktemp "$home/.config.json.XXXXXX")
  chmod 600 "$tmp"
  printf '%s\n' "$next" >"$tmp"
  mv "$tmp" "$config"
fi

if [[ -n $live ]] && [[ $(jq -c 'del(.plugins)' <<<"$next") != "$settings_before" ]]; then
  step daemon reload
fi

if ((${#restart[@]})); then
  warn "restart Paseo to finish applying: ${restart[*]} (path changed or removed)"
fi
