{
  lib,
  inputs,
  ...
}: let
  mkPaseo = system: inputs.paseo.packages.${system}.default;

  mkPackages = pkgs: rec {
    gsd-omp = pkgs.callPackage ./packages/gsd-omp {};
    omp-extensions = import ./omp-extensions {
      inherit (pkgs) lib stdenvNoCC runCommand bun;
      inherit gsd-omp;
    };
    paseo-plugins = import ./paseo-plugins {
      inherit (pkgs) lib stdenvNoCC bun curl esbuild fetchurl jq writeShellApplication;
      # Plugins are checked against the pinned Paseo (requirements.paseo).
      paseoVersion = inputs.paseo.packages.${pkgs.stdenv.hostPlatform.system}.default.version;
    };
  };
in {
  perSystem = {pkgs, ...}: let
    packages = mkPackages pkgs;
    inherit (pkgs.stdenv.hostPlatform) system;
  in {
    packages =
      {
        inherit (packages) gsd-omp;
        # Paseo's daemon and headless Chromium against every plugin; runs on Linux and macOS.
        paseo-plugins-e2e = pkgs.callPackage ./paseo-plugins/_e2e {
          paseo = mkPaseo system;
          plugins = packages.paseo-plugins;
        };
      }
      // lib.mapAttrs' (name: lib.nameValuePair "omp-extension-${name}") packages.omp-extensions
      // lib.mapAttrs' (name: lib.nameValuePair "paseo-plugin-${name}") packages.paseo-plugins;
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

        paseo = mkPaseo system;

        paseo-desktop = inputs.paseo.packages.${system}.desktop.override {
          inherit (final) paseo;
        };

        # The install check's `omp --smoke-test` fails in the Darwin sandbox
        # ("Port 0 is in use") when it starts the stats server.
        omp = inputs.llm-agents.packages.${system}.omp.overrideAttrs {
          doInstallCheck = false;
        };

        inherit
          (inputs.llm-agents.packages.${system})
          spec-kit
          openspec
          ;
      }
      // (mkPackages final);

    modules.homeManager = {
      oh-my-pi = ./homeModules/oh-my-pi.nix;
      paseo = ./homeModules/paseo.nix;
      searxng = ./homeModules/searxng.nix;
    };
  };
}
