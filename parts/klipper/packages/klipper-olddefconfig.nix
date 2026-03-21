{
  writeShellApplication,
  klipper,
  python3,
  gnumake,
  stdenvNoCC,
  ...
}: let
  s = stdenvNoCC.mkDerivation {
    name = "${klipper.pname}-source";

    src = klipper.src;

    dontConfigure = true;

    patchPhase = ''
      patchShebangs .
    '';

    buildPhase = ''
      [ -f ./scripts/find-firmware-extras.sh ] && ./scripts/find-firmware-extras.sh || echo "No firmware extras script found (assuming this is klipper)"
    '';

    installPhase = ''
      cp -r . $out/
    '';
  };
in
  writeShellApplication {
    name = "${klipper.pname}-olddefconfig";
    runtimeInputs = [
      python3
      gnumake
    ];
    text = ''
      CURRENT_DIR=$(pwd)
      CONFIG_FILE="$CURRENT_DIR/''${1:-config}"
      TMP=$(mktemp -d)
      make -C ${s} OUT="$TMP" KCONFIG_CONFIG="$CONFIG_FILE" olddefconfig
      rm -rf "$TMP" "$CONFIG_FILE.old"
      printf "\nUpdated firmware configuration for klipper:\n\n"
      cat "$CONFIG_FILE"
    '';
  }
