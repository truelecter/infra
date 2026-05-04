{self, ...}: let
  mkPackages = pkgs:
    self.lib.importPackages {
      nixpkgs = pkgs;
      packages = ./packages;
      sources = ./sources/generated.nix;
    };
in {
  perSystem = {pkgs, ...}: {
    packages = mkPackages pkgs;
  };

  flake = {
    overlays.minecraft-servers = final: _prev: mkPackages final;
    overlays.minecraft-mods = final: _prev: mkPackages final;

    modules.nixos = {
      minecraft-servers = self.lib.combineModules ./modules;
      minecraft-servers-with-overlay = {
        imports = [self.modules.nixos.minecraft-servers];

        nixpkgs.overlays = [self.overlays.minecraft-servers];
      };
    };
  };
}
