# CI-only derivations, exposed as `ci.<system>.<name>`. Kept out of `packages`,
# so `nix flake check` and `nix flake show` skip them.
#
# .github/workflows/build-hosts.yaml reads two GitHub Actions matrices with
# `nix eval --json .#ciMatrix.<name>`:
# - `ciMatrix.shared`: every `ci.<system>.<name>` derivation, built and pushed
#   to Attic before the hosts, so the host builds substitute them. Add heavy
#   packages that several hosts share here.
# - `ciMatrix.hosts`: every NixOS and darwin host not in `ci.excludeHosts`.
{
  lib,
  config,
  self,
  flake-parts-lib,
  ...
}: let
  cfg = config.ci;

  runnerFor = what: system: cfg.runners.${system} or (throw "ci.runners has no runner for ${what} (${system})");

  hostEntries = kind: configurations:
    lib.pipe configurations [
      (lib.filterAttrs (hostname: _: !(lib.elem hostname cfg.excludeHosts)))
      (lib.mapAttrsToList (hostname: host: {
        inherit hostname;
        os = runnerFor hostname host.config.nixpkgs.hostPlatform.system;
        attr = "${kind}.${hostname}.config.system.build.toplevel";
      }))
    ];

  sharedEntries = lib.concatLists (lib.mapAttrsToList (system: derivations:
    map (name: {
      inherit name system;
      os = runnerFor "ci.${system}.${name}" system;
      attr = "ci.${system}.${name}";
    }) (lib.attrNames derivations))
  self.ci);
in {
  options = {
    perSystem = flake-parts-lib.mkPerSystemOption {
      options.ci = lib.mkOption {
        type = lib.types.lazyAttrsOf lib.types.package;
        default = {};
        description = "Derivations CI builds before the hosts, so the host builds substitute them.";
      };
    };

    ci = {
      runners = lib.mkOption {
        type = lib.types.attrsOf lib.types.str;
        default = {
          aarch64-linux = "ubuntu-22.04-arm";
          x86_64-linux = "ubuntu-22.04";
          aarch64-darwin = "macos-26";
        };
        description = "GitHub Actions runner for each system.";
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

    ci.excludeHosts = ["bttpitest"];

    flake.ciMatrix = {
      shared.include = sharedEntries;

      hosts.include =
        hostEntries "nixosConfigurations" self.nixosConfigurations
        ++ hostEntries "darwinConfigurations" self.darwinConfigurations;
    };
  };
}
