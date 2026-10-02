{
  lib,
  inputs,
  ...
}: let
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
    overlays.ai = final: _prev: let
      inherit (final.stdenv.hostPlatform) system;

      latest = import inputs.latest {
        inherit system;
        config.allowUnfree = true;
      };
    in
      {
        inherit
          (latest)
          searxng
          ;

        # upstream nix/npm-deps.hash stale for v0.10.1 -> override
        paseo = inputs.paseo.packages.${system}.default.override {
          npmDepsHash = "sha256-tT7qrQpJSxXTJMc9KinfnDQoeTdvLt7NWanYANKunqg=";
        };

        paseo-desktop = inputs.paseo.packages.${system}.desktop.override {
          inherit (final) paseo;
        };

        inherit
          (inputs.llm-agents.packages.${system})
          omp
          spec-kit
          openspec
          ;
      }
      // (mkPackages final);

    modules.homeManager = {
      oh-my-pi = ./homeModules/oh-my-pi.nix;
      searxng = ./homeModules/searxng.nix;
    };
  };
}
