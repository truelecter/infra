{
  inputs,
  lib,
  self,
  ...
}: let
  mkPackages = pkgs':
    self.lib.importPackages {
      nixpkgs = pkgs';
      packages = ./packages;
      sources = ./sources/generated.nix;
    };
in {
  perSystem = {
    config,
    self',
    inputs',
    pkgs,
    system,
    ...
  }:
    lib.optionalAttrs (system == "aarch64-linux") {
      packages = mkPackages pkgs;
    };

  flake = {
    overlays.raspberry-pi = final: prev: let
      pkgs = mkPackages final;

      latest = import inputs.latest {
        inherit (prev.stdenv.hostPlatform) system;
        config.allowUnfree = true;
      };
    in
      pkgs
      // {
        inherit
          (latest)
          # raspberrypiWirelessFirmware
          # raspberrypifw
          # linuxPackages_rpi4
          ubootRaspberryPi4_64bit
          ubootRaspberryPi3_64bit
          ;

        origRpiWirelessFirmware = latest.raspberrypiWirelessFirmware;

        deviceTree =
          prev.deviceTree
          // {
            applyOverlays = final.callPackage ./extra/dtmerge.nix {};
          };

        makeModulesClosure = x: prev.makeModulesClosure (x // {allowMissing = true;});
      };

    modules.nixos = {
      raspberry-pi-overlay = {
        nixpkgs.overlays = [
          inputs.nixos-raspberrypi.overlays.vendor-firmware
          inputs.nixos-raspberrypi.overlays.vendor-kernel
          inputs.nixos-raspberrypi.overlays.vendor-pkgs
          inputs.nixos-raspberrypi.overlays.kernel-and-firmware
          self.overlays.raspberry-pi
        ];
      };
    };
  };
}
