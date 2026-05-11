{
  lib,
  self,
  ...
}: let
in {
  perSystem = {
    pkgs,
    system,
    ...
  }:
    lib.optionalAttrs (system == "x86_64-linux") {
      packages = let
        kernels = self.lib.importPackages {
          nixpkgs = pkgs;
          packages = ./kernels;
          sources = ./sources/generated.nix;
        };

        mkModulesImage = kernel:
          pkgs.callPackage ./lib/mkModulesImage.nix {
            inherit kernel;
          };

        mkWslBundle = kernel: modulesImage:
          pkgs.callPackage ./lib/mkWslBundle.nix {
            inherit kernel modulesImage;
          };

        wslBundle = kernel: let
          modulesImage = mkModulesImage kernel;
        in
          mkWslBundle kernel modulesImage;

        bundles = lib.mapAttrs' (name: kernel: lib.nameValuePair "${name}-bundle" (wslBundle kernel)) kernels;
      in
        bundles;
    };
}
