{
  pkgs,
  config,
  ...
}: {
  programs.vscode.profiles.default = {
    extensions =
      pkgs.nix4vscode.forVscodeVersion config.programs.vscode.package.vscodeVersion
      [
        "ms-python.python"
        "ms-python.vscode-pylance"
      ];

    userSettings = {
      "python.defaultInterpreterPath" = "${pkgs.python3}/bin/python3";
    };
  };
}
