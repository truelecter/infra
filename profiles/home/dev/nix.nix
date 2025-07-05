{
  pkgs,
  config,
  ...
}: {
  programs.vscode.profiles.default = {
    extensions =
      pkgs.nix4vscode.forVscodeVersion config.programs.vscode.package.vscodeVersion
      [
        "arrterian.nix-env-selector"
        "bbenoist.nix"
        "jnoortheen.nix-ide"
      ];

    userSettings = {
      "nix.serverPath" = "nil";
      "nix.serverSettings" = {
        "nil" = {
          "formatting" = {
            "command" = ["alejandra"];
          };
        };
      };
      "nix.enableLanguageServer" = true;
      "[nix]" = {"editor.formatOnSave" = true;};
    };
  };

  home.packages = with pkgs; [
    alejandra
    nil
  ];
}
