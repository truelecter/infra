{lib, ...}: let
  mkPackages = pkgs: rec {
    gsd-omp = pkgs.callPackage ./packages/gsd-omp {};
    omp-extensions = import ./omp-extensions {
      inherit (pkgs) lib stdenvNoCC runCommand bun;
      inherit gsd-omp;
    };
  };
in {
  perSystem = {pkgs, ...}: let
    packages = mkPackages pkgs;
  in {
    packages =
      {inherit (packages) gsd-omp;}
      // lib.mapAttrs' (name: lib.nameValuePair "omp-extension-${name}") packages.omp-extensions;
  };

  flake = {
    overlays.ai = final: _prev: mkPackages final;

    modules.homeManager.oh-my-pi = ./homeModules/oh-my-pi.nix;
  };
}
