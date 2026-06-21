{
  pkgs,
  lib,
  ...
}: {
  imports = [
    ./_core-extensions.nix
  ];

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
  };
}
