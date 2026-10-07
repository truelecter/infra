# CI-only derivations, exposed as `ci.<system>.<name>`. Kept out of `packages`,
# so `nix flake check` and `nix flake show` skip them.
{
  lib,
  flake-parts-lib,
  ...
}: {
  options.perSystem = flake-parts-lib.mkPerSystemOption {
    options.ci = lib.mkOption {
      type = lib.types.lazyAttrsOf lib.types.package;
      default = {};
      description = "Derivations built by CI.";
    };
  };

  config.transposition.ci = {};
}
