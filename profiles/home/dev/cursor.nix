{pkgs, ...}: {
  home.shellAliases = let
    cursor = "${pkgs.code-cursor}/Applications/Cursor.app/Contents/Resources/app/bin/code";
  in {
    cursor = "${cursor}";
    code = "${cursor}";
  };

  programs.vscode = {
    enable = true;
    package = pkgs.code-cursor;
  };
}
