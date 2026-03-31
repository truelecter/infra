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
      "nix.serverPath" = "nixd";
      "nix.serverSettings" = {
        nixd = {
          formatting = {
            command = ["alejandra"];
          };
          # TODO: port https://github.com/MattSturgeon/nix-config/blob/27142064ea7f2ffc20172acc801c718e4589f8d3/nvim/config/lsp.nix#L21-L55 ?
          # options = {
          # };
        };
      };
      "nix.enableLanguageServer" = true;
      "[nix]" = {"editor.formatOnSave" = true;};
    };
  };

  home.packages = with pkgs; [
    alejandra
    nixd
  ];
}
