# CI-only derivations, exposed as `ci.<system>.<name>`. Kept out of `packages`,
# so `nix flake check` and `nix flake show` skip them.
#
# `ciMatrix.hosts` is the GitHub Actions matrix of the host builds in
# .github/workflows/build-hosts.yaml, read with `nix eval --json .#ciMatrix.hosts`.
{
  lib,
  config,
  self,
  flake-parts-lib,
  ...
}: let
  cfg = config.ci;

  hostEntries = kind: configurations:
    lib.pipe configurations [
      (lib.filterAttrs (hostname: _: !(lib.elem hostname cfg.excludeHosts)))
      (lib.mapAttrsToList (hostname: host: let
        system = host.config.nixpkgs.hostPlatform.system;
      in {
        inherit hostname;
        os = cfg.runners.${system} or (throw "ci.runners has no runner for ${hostname} (${system})");
        attr = "${kind}.${hostname}.config.system.build.toplevel";
      }))
    ];
in {
  options = {
    perSystem = flake-parts-lib.mkPerSystemOption {
      options.ci = lib.mkOption {
        type = lib.types.lazyAttrsOf lib.types.package;
        default = {};
        description = "Derivations built by CI.";
      };
    };

    ci = {
      runners = lib.mkOption {
        type = lib.types.attrsOf lib.types.str;
        default = {
          aarch64-linux = "ubuntu-22.04-arm";
          x86_64-linux = "ubuntu-22.04";
          aarch64-darwin = "macos-14";
        };
        description = "GitHub Actions runner for each host system.";
      };

      excludeHosts = lib.mkOption {
        type = lib.types.listOf lib.types.str;
        default = [];
        description = "Hosts CI does not build.";
      };
    };

    flake.ciMatrix = lib.mkOption {
      type = lib.types.lazyAttrsOf lib.types.raw;
      readOnly = true;
      description = "GitHub Actions matrices, read by the workflows.";
    };
  };

  config = {
    transposition.ci = {};

    flake.ciMatrix.hosts.include =
      hostEntries "nixosConfigurations" self.nixosConfigurations
      ++ hostEntries "darwinConfigurations" self.darwinConfigurations;
  };
}
