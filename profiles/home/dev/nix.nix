{pkgs, ...}: {
  programs.vscode.profiles.default = {
    extensions = with pkgs.vscode-marketplace; [
      arrterian.nix-env-selector
      bbenoist.nix
      jnoortheen.nix-ide
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
