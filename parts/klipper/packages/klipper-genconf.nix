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
      ./scripts/find-firmware-extras.sh
    '';

    installPhase = ''
      cp -r . $out/
    '';
  };
in
  writeShellApplication {
    name = "${klipper.pname}-genconf";
    runtimeInputs = [
      python3
      gnumake
    ];
    text = ''
      CURRENT_DIR=$(pwd)
      CONFIG_FILE="$CURRENT_DIR/''${1:-config}"
      TMP=$(mktemp -d)
      make -C ${s} OUT="$TMP" KCONFIG_CONFIG="$CONFIG_FILE" menuconfig
      rm -rf "$TMP" "$CONFIG_FILE.old"
      printf "\nYour firmware configuration for klipper:\n\n"
      cat "$CONFIG_FILE"
    '';
  }
