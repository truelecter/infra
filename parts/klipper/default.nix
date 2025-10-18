{
  inputs,
  lib,
  self,
  ...
}: let
  mkPackages = pkgs: let
    latest = import inputs.latest {
      inherit (pkgs.stdenv.hostPlatform) system;
      config.allowUnfree = true;
    };

    sources = pkgs.callPackage ./sources/generated.nix {};

    packages = self.lib.importPackages {
      inherit sources;

      nixpkgs = pkgs;
      packages = ./packages;

      extraArguments = {
        inherit (inputs) pyproject-nix;
        inherit (latest) libdatachannel;
      };
    };

    klipper-plugins = self.lib.importPackages {
      inherit sources;

      nixpkgs = pkgs;
      packages = ./plugins;

      extraArguments = {
        inherit (packages) chopper-resonance-tuner;
      };
    };

    klipper-distribution = name: source: let
      klipper = packages.klipper.overrideAttrs (_: {
        inherit (source) pname version src;
      });
    in {
      ${name} = klipper;

      "${name}-full-plugins" = klipper.override {
        plugins = lib.attrValues (lib.filterAttrs (n: _: !builtins.elem n excluded-plugins-from-full) klipper-plugins);
      };

      "${name}-genconf" = packages.klipper-genconf.override {
        inherit klipper;
      };

      "${name}-firmware" = packages.klipper-firmware.override {
        inherit klipper;
      };
    };

    excluded-plugins-from-full = ["sources"];
  in
    packages
    # TODO: prefix plugins with klipper- if the name does not have this prefix
    // klipper-plugins
    // {
      klipper-full-plugins = packages.klipper.override {
        plugins = lib.attrValues (lib.filterAttrs (n: _: !builtins.elem n excluded-plugins-from-full) klipper-plugins);
      };
    }
    // (
      klipper-distribution "kalico" sources.kalico
    )
    // (
      klipper-distribution "experimental-kalico" sources.experimental-kalico
    )
    // {
      camera-streamer-libcamera = packages.camera-streamer.override {
        useLibcamera = true;
      };
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
    lib.optionalAttrs (self.lib.isLinux system) {
      packages = mkPackages pkgs;
    };

  flake = {
    overlays.klipper = final: prev: mkPackages final;

    modules.nixos = {
      klipper = self.lib.combineModules ./modules;

      klipper-with-overlay = {
        imports = [self.modules.nixos.klipper];

        nixpkgs.overlays = [self.overlays.klipper];
      };
    };
  };
}
