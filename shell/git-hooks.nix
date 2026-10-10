{inputs, ...}: {
  imports = [inputs.git-hooks.flakeModule];

  perSystem = {
    config,
    lib,
    pkgs,
    ...
  }: let
    # Allows WIP, fixup! and squash! commits locally, and merge commits.
    conform-commit-msg = pkgs.writeShellScript "conform-commit-msg" ''
      if git rev-parse -q --verify MERGE_HEAD >/dev/null ||
        head -n 1 "$1" | grep -Eq '^(WIP|wip)(:.*)?$|fixup!|squash!'; then
        exit 0
      fi
      exec ${lib.getExe pkgs.conform} enforce --commit-msg-file "$1"
    '';
  in {
    pre-commit = {
      # `checks.treefmt` already covers formatting in `nix flake check`.
      check.enable = false;

      settings = {
        package = pkgs.prek;

        hooks = {
          # Uses the treefmt-nix wrapper (shell/treefmt.nix).
          treefmt.enable = true;

          conform-commit-msg = {
            enable = true;
            name = "conform enforce";
            entry = "${conform-commit-msg}";
            stages = ["commit-msg"];
          };
        };
      };
    };

    devshells.default = {
      packages = [
        config.pre-commit.settings.package
        pkgs.conform
      ];

      devshell.startup.git-hooks.text = config.pre-commit.installationScript;
    };
  };
}
