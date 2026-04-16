{
  writeShellApplication,
  sources,
  python3,
  gnumake,
  ...
}:
writeShellApplication {
  name = "katapult-menuconfig";
  runtimeInputs = [
    python3
    gnumake
  ];
  text = ''
    CURRENT_DIR=$(pwd)
    CONFIG_FILE="$CURRENT_DIR/''${1:-config}"
    TMP=$(mktemp -d)
    make -C ${sources.katapult.src} OUT="$TMP" KCONFIG_CONFIG="$CONFIG_FILE" menuconfig
    rm -rf "$TMP" "$CONFIG_FILE.old"
    printf "\nYour firmware configuration for katapult:\n\n"
    cat "$CONFIG_FILE"
  '';
}
