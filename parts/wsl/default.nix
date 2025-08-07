{
  lib,
  self,
  inputs,
  ...
}: let
  mkModulesImage = pkgs': kernel:
    pkgs'.callPackage ./lib/mkModulesImage.nix {
      inherit kernel;
    };

  mkKernels = pkgs':
    self.lib.importPackages {
      nixpkgs = pkgs';
      packages = ./kernels;
      sources = ./sources/generated.nix;
    };

  mkWslBundle = pkgs': kernel: modulesImage:
    pkgs'.callPackage ./lib/mkWslBundle.nix {
      inherit kernel modulesImage;
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
    lib.optionalAttrs (system == "x86_64-linux") {
      packages = let
        kernels = mkKernels pkgs;

        wslBundle = kernel: let
          modulesImage = mkModulesImage pkgs kernel;
        in
          mkWslBundle pkgs kernel modulesImage;

        bundles = lib.mapAttrs' (name: kernel: lib.nameValuePair "${name}-bundle" (wslBundle kernel)) kernels;
      in
        bundles;
    };
}
