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
      inherit (pkgs) btt-6_12-dtb uboot-btt panel-simple-btt raspits_ft5426;

      linuxPackages_bttPi2_6_12 = inputs.nixos-rockchip.legacyPackages.${prev.stdenv.hostPlatform.system}.kernel_linux_6_12_rockchip;

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
