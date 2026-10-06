{
  lib,
  self,
  inputs,
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
    pkgs,
    system,
    ...
  }:
    lib.optionalAttrs (system == "aarch64-linux") {
      packages = mkPackages pkgs;
    };

  flake = {
    overlays.btt-pi-v2 = final: prev: let
      pkgs = mkPackages final;
    in {
      inherit (pkgs) uboot-btt raspits_ft5426 tc358762-burst;

      linuxPackages_bttPi2 = inputs.nixos-rockchip.legacyPackages.${prev.stdenv.hostPlatform.system}.kernel_linux_latest_rockchip_stable;

      deviceTree =
        prev.deviceTree
        // {
          applyOverlays = final.callPackage ./extra/dtmerge.nix {};
        };
    };

    modules.nixos = {
      rockchip = self.lib.combineModules ./modules;
      rockchip-with-overlay = {
        imports = [self.modules.nixos.rockchip];
        nixpkgs.overlays = [self.overlays.btt-pi-v2];
      };
    };
  };
}
