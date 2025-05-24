{pkgs, ...}: {
  programs.vscode.profiles.default = {
    extensions = with pkgs.vscode-marketplace; [
      golang.go
    ];
  };
}
