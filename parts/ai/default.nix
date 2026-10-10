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

        # Metro transforms the generated validator `@getpaseo/protocol`
        # `dist/generated/validation/ws-outbound.aot.js` (about 12 MB) in one
        # worker, which needs more than 2 GB of heap. Node's default heap limit
        # (V8's old generation) is half the machine's memory, at most 2 GB, or
        # 4 GB with 15 GB of memory or more. So 4096 MB is V8's own ceiling: it
        # changes nothing on bigger builders and lifts the 2 GB limit of a 7 GB
        # GitHub macOS runner, where the worker ran out of memory.
        paseo-desktop =
          (inputs.paseo.packages.${system}.desktop.override {
            inherit (final) paseo;
          }).overrideAttrs (old: {
            env = old.env // {NODE_OPTIONS = "--max-old-space-size=4096";};
          });

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
