{
  # pkgs,
  sources,
  lib,
  writeTextFile,
  linuxManualConfig,
  linux-firmware,
  ...
}: let
  inherit (sources.wsl-kernel-6-6-87-2) src tag;
in
  linuxManualConfig {
    inherit src;

    version = "${tag}-wsl";

    allowImportFromDerivation = true;

    # configfile = "${src}/Microsoft/config-wsl";
    configfile = writeTextFile {
      name = "config-wsl";
      text = lib.concatStringsSep "\n" [
        (builtins.readFile ./_configs/6.6.87.2-rtl-bt-fw.config)
        ''
          CONFIG_EXTRA_FIRMWARE="rtl_bt/rtl8761bu_fw.bin rtl_bt/rtl8761bu_config.bin"
          CONFIG_EXTRA_FIRMWARE_DIR="${linux-firmware}/lib/firmware"
        ''
      ];
    };
    modDirVersion = "${tag}-microsoft-standard-WSL2";
  }
