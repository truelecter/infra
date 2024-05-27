# Creds to https://github.com/NixOS/nixpkgs/blob/nixos-23.11/pkgs/servers/klipper/klipper-firmware.nix#L57
{
  stdenv,
  lib,
  pkg-config,
  pkgsCross,
  bintools-unwrapped,
  libffi,
  libusb1,
  wxGTK32,
  python3,
  gcc-arm-embedded-11,
  sources,
  avrdude,
  stm32flash,
  firmwareConfig ? null,
  mcu ? "mcu",
  ...
}: let
  inherit (sources) katapult;
in
  stdenv.mkDerivation {
    name = "katapult-${mcu}";

    inherit (katapult) version src;

    nativeBuildInputs = [
      python3
      pkgsCross.avr.stdenv.cc
      gcc-arm-embedded-11
      bintools-unwrapped
      libffi
      libusb1
      avrdude
      stm32flash
      pkg-config
      # wxGTK32 # Required for bossac
    ];

    preBuild = "cp ${firmwareConfig} ./.config";

    postPatch = ''
      patchShebangs .
    '';

    makeFlags = [
      "V=1"
      "KCONFIG_CONFIG=${firmwareConfig}"
    ];

    installPhase = ''
      mkdir -p $out
      cp ./.config $out/config
      cp out/katapult.bin $out/ || true
      cp out/deployer.bin $out/ || true
      cp out/katapult.uf2 $out/ || true
    '';

    strictDeps = true;
    disallowedReferences = [
      gcc-arm-embedded-11
    ];

    dontFixup = true;

    meta = with lib; {
      license = licenses.gpl3Only;
      homepage = "https://github.com/Arksine/katapult";
      description = "Configurable bootloader for Klipper";
      platforms = platforms.linux;
    };
  }
