{
  pkgs,
  config,
  ...
}: {
  programs.vscode.profiles.default = {
    extensions =
      pkgs.nix4vscode.forVscodeVersion config.programs.vscode.package.vscodeVersion
      [
        "golang.go"
      ];
  };
}
