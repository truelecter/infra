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

      nixos-raspberrypi = inputs.nixos-raspberrypi.packages.${prev.stdenv.hostPlatform.system};
    in
      # pkgs
      # //
      {
        inherit
          (latest)
          # raspberrypiWirelessFirmware
          # raspberrypifw
          # linuxPackages_rpi4
          ubootRaspberryPi4_64bit
          ubootRaspberryPi3_64bit
          mediamtx
          ;

        inherit (nixos-raspberrypi) raspberrypi-udev-rules rpicam-apps;

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
          self.overlays.raspberry-pi
        ];
      };

      nixos-raspberry-pi-overlays = {
        nixpkgs.overlays = [
          inputs.nixos-raspberrypi.overlays.vendor-firmware
          inputs.nixos-raspberrypi.overlays.vendor-kernel
          inputs.nixos-raspberrypi.overlays.vendor-pkgs
          inputs.nixos-raspberrypi.overlays.kernel-and-firmware
          # inputs.nixos-raspberrypi.overlays.pkgs
        ];
      };
    };
  };
}
