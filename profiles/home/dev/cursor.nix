{
  pkgs,
  lib,
  ...
}: {
  home.shellAliases = {
    cursor = "~/.config/path/cursor";
    code = "~/.config/path/cursor";
  };

  home.file = let
    cursor = lib.getExe pkgs.code-cursor;
  in {
    ".config/path/cursor" = {
      executable = true;
      source = cursor;
    };
    ".config/path/code" = {
      executable = true;
      source = cursor;
    };
  };

  programs.cursor = {
    enable = true;

    # Until I come up with better solution. See https://github.com/nix-community/home-manager/pull/8851
    # Use everything from vscode as other modules set its settings
    # profiles.default = config.programs.vscode.profiles.default;
  };

  programs.vscode-universal.usedDistributions = [
    "cursor"
  ];
}
