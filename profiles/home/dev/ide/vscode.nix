{pkgs, ...}: {
  imports = [
    ./_core-extensions.nix
  ];

  programs.vscode = {
    enable = true;
    package = pkgs.vscode;
  };
}
