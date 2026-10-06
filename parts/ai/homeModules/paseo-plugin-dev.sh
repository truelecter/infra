# Points a programs.paseo plugin link (~/.paseo/hm-plugins/<id>) at a checkout folder, or back at
# its installed build, and reloads the plugin in the running daemon. No switch, no Paseo restart:
# Paseo keeps the link path in config.json and follows the link only when it compiles the plugin.
# The next switch puts every link back on its installed build (the links are `force`d) and reloads it.
#
#   paseo-plugin-dev link <id> [<folder>]   default folder: parts/ai/paseo-plugins/<id> in the
#                                           git checkout around the current directory
#   paseo-plugin-dev restore <id>
#   paseo-plugin-dev status
#
# Wrapped by paseo.nix, which sets PASEO_DEV_ROOT (the link folder), PASEO_DEV_PLUGINS (JSON:
# id -> installed build) and PASEO_DEV_CLI (the Paseo CLI, may be empty).

root=$PASEO_DEV_ROOT
cli=${PASEO_DEV_CLI:-paseo}

die() {
  echo "paseo-plugin-dev: $*" >&2
  exit 1
}

usage() {
  echo "usage: paseo-plugin-dev link <id> [<folder>] | restore <id> | status" >&2
  exit 2
}

installed() { jq -r --arg id "$1" '.[$id] // empty' "$PASEO_DEV_PLUGINS"; }

managed() {
  local id=$1 build
  build=$(installed "$id")
  [[ -n $build ]] || die "unknown plugin '$id' (managed: $(jq -r 'keys | join(" ")' "$PASEO_DEV_PLUGINS"))"
  [[ -L $root/$id ]] || die "$root/$id is not a link yet; switch once to create it"
  printf '%s' "$build"
}

reload() {
  local id=$1 output
  if ! "$cli" plugin ls --json >/dev/null 2>&1; then
    echo "Paseo is not running; it loads $id from the link on its next start."
    return
  fi
  if ! output=$("$cli" plugin reload "$id" 2>&1); then
    die "\`paseo plugin reload $id\` failed: $output"
  fi
  echo "Reloaded $id. Output: paseo plugin logs $id"
}

case ${1:-} in
link)
  [[ $# -ge 2 && $# -le 3 ]] || usage
  id=$2
  managed "$id" >/dev/null
  if [[ $# -eq 3 ]]; then
    folder=$3
  else
    top=$(git rev-parse --show-toplevel 2>/dev/null) || die "not in a git checkout; pass the plugin folder"
    folder=$top/parts/ai/paseo-plugins/$id
  fi
  [[ -d $folder ]] || die "no folder $folder"
  folder=$(cd "$folder" && pwd)
  manifest_id=$(jq -r '.id // empty' "$folder/paseo-plugin.json" 2>/dev/null) ||
    die "$folder/paseo-plugin.json is missing or not JSON"
  [[ $manifest_id == "$id" ]] || die "$folder is plugin '$manifest_id', not '$id'"
  # The store build bundles runtime dependencies in; Paseo compiles a checkout from source, so it
  # needs its own node_modules.
  if jq -e '(.dependencies // {}) | length > 0' "$folder/package.json" >/dev/null 2>&1 &&
    [[ ! -d $folder/node_modules ]]; then
    die "$id has dependencies: run \`bun install\` in $folder first"
  fi
  ln -sfn "$folder" "$root/$id"
  echo "$root/$id -> $folder"
  reload "$id"
  ;;
restore)
  [[ $# -eq 2 ]] || usage
  id=$2
  build=$(managed "$id")
  ln -sfn "$build" "$root/$id"
  echo "$root/$id -> $build"
  reload "$id"
  ;;
status)
  [[ $# -eq 1 ]] || usage
  while read -r id; do
    build=$(installed "$id")
    if [[ ! -e $root/$id ]]; then
      echo "$id: not linked yet (switch once)"
    elif [[ $(readlink -f "$root/$id") == "$(readlink -f "$build")" ]]; then
      echo "$id: installed build"
    else
      echo "$id: $(readlink "$root/$id")"
    fi
  done < <(jq -r 'keys[]' "$PASEO_DEV_PLUGINS")
  ;;
*)
  usage
  ;;
esac
