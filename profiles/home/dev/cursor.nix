{pkgs, ...}: {
  home.shellAliases = {
    cursor = "~/.config/path/cursor";
    code = "~/.config/path/cursor";
  };

  home.file = let
    cursor = "${pkgs.code-cursor}/Applications/Cursor.app/Contents/Resources/app/bin/code";
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

  programs.vscode = {
    enable = true;
    package = pkgs.code-cursor;
  };
}
