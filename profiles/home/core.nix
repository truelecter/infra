{pkgs, ...}: {
  xdg.enable = true;

  programs = {
    lsd = {
      enable = true;
      enableZshIntegration = true;
      enableBashIntegration = true;
    };

    bat = {
      enable = true;
    };
  };

  home.packages = with pkgs; [
    bottom
    nix-tree
  ];

  catppuccin = {
    flavor = "mocha";
    enable = true;
    vscode.profiles.default.icons.enable = false;
  };
}
