{
  # pkgs,
  sources,
  lib,
  writeTextFile,
  linuxManualConfig,
  linux-firmware,
  ...
}: let
  srcConfig = sources.wsl-xanmod-lts.src;
  srcXanmod = sources.xanmod-lts.src;

  sourceVersion = sources.wsl-xanmod-lts.version;

  version = let
    match = builtins.match "^([0-9]+\\.[0-9]+\\.[0-9]+).+" sourceVersion;
  in
    if match != null
    then builtins.elemAt match 0
    else throw "Failed to extract version from ${sourceVersion}";
in
  linuxManualConfig {
    pname = "linux-xanmod-wsl";
    inherit version;

    src = srcXanmod;
    modDirVersion = "${version}-locietta-WSL2-xanmod1";

    allowImportFromDerivation = true;

    configfile = writeTextFile {
      name = "config-wsl";
      text = lib.concatStringsSep "\n" [
        (builtins.readFile "${srcConfig}/configs/config-wsl.LTS")
        ''
          CONFIG_EXTRA_FIRMWARE="rtl_bt/rtl8761bu_fw.bin rtl_bt/rtl8761bu_config.bin"
          CONFIG_EXTRA_FIRMWARE_DIR="${linux-firmware}/lib/firmware"
        ''
      ];
    };
  }
