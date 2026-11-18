# `checks.<system>.nix-config`: flake.nix `nixConfig` has to be a literal, so it
# can't read profiles/common/caches.nix. This fails when it lacks one of the
# substituters or keys the hosts use.
{self, ...}: {
  perSystem = {
    lib,
    pkgs,
    ...
  }: let
    hosts = (import ../profiles/common/caches.nix {inherit (self) catalog;}).nix.settings;
    flake = (import ../flake.nix).nixConfig;

    missing = what: wanted: present: map (v: "${what} ${v}") (lib.subtractLists present wanted);
    problems =
      missing "substituter" hosts.substituters flake.extra-substituters
      ++ missing "trusted key" hosts.trusted-public-keys flake.extra-trusted-public-keys;
  in {
    checks.nix-config = pkgs.runCommand "nix-config-check" {} (
      if problems == []
      then "touch $out"
      else ''
        echo "flake.nix nixConfig lacks what profiles/common/caches.nix sets:" >&2
        ${lib.concatMapStringsSep "\n" (p: "echo ${lib.escapeShellArg "- ${p}"} >&2") problems}
        exit 1
      ''
    );
  };
}
