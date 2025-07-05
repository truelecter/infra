{pkgs, ...}: let
  inherit (pkgs) writeScriptBin nvfetcher-bin nix4vscode cachix;

  update-sources = writeScriptBin "update-sources" ''
    function updatePartsSources {
      PART="$1"
      shift
      ${nvfetcher-bin}/bin/nvfetcher -t --keep-old -o "$PART/sources/" -c "$PART/sources/nvfetcher.toml" $@
    }

    export TMPDIR="/tmp"
    PART="$1"

    shift

    if [ -z "$PART" ]; then
      echo "Please, provide part name or ALL to update all possible sources"
      exit 1
    fi

    if [ "$PART" = "ALL" ]; then
      shopt -s nullglob
      PARTS=($PRJ_ROOT/parts/*/)
      shopt -u nullglob
    else
      PART_PATH="$PRJ_ROOT/parts/$PART/"

      if [ ! -d "$PART_PATH" ]; then
        echo "'$PART' does not appear to be a part!"
        exit 1
      fi

      if [ ! -f "$PART_PATH/sources/nvfetcher.toml" ]; then
        echo "'$PART' does not appear to have valid sources structure!"
        echo "Sources should be located in 'sources' dir of part and contain 'nvfetcher.toml' file within it"
        exit 1
      fi

      PARTS=( $PART_PATH )
    fi

    for C in "''${PARTS[@]}"; do
      if [ -f "$C/sources/nvfetcher.toml" ]; then
        updatePartsSources "$C" $@
      else
        echo "'$C/sources/nvfetcher.toml' does not exist. Ignoring..."
      fi
    done

    exit 0
  '';
in {
  commands = [
    {
      category = "repo";
      name = "update-sources";
      help = "update nvfetcher sources";
      package = update-sources;
    }
    {
      category = "repo";
      package = nvfetcher-bin;
    }
    {
      category = "nix";
      package = cachix;
    }
  ];
}
