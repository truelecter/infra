{inputs, ...}: let
  # catppuccin/nix builds its ports from a legacyPackages and does not respect
  # overrides. Because stable nixpkgs lags behind with some fixes, override
  # sources to system instance of pkgs, which has all neede overrides
  withConfigPkgs = module: {pkgs, ...}: {
    imports = [module];

    catppuccin.sources = (import inputs.catppuccin {inherit pkgs;}).packages;
  };
in {
  flake.modules = {
    nixos.catppuccin = withConfigPkgs inputs.catppuccin.nixosModules.catppuccin;
    homeManager.catppuccin = withConfigPkgs inputs.catppuccin.homeModules.catppuccin;
  };
}
