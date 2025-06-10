{
  pkgs,
  profiles,
  hmSuites,
  ...
}: {
  imports = [
    (import ./__common-gui.nix {username = "truelecter";})
  ];

  home-manager.users.truelecter = {
    imports = hmSuites.base;
  };

  system.defaults.dock.persistent-apps = [
    "/Applications/Zen.app"
    # "/Applications/Arc.app"
    "/Applications/iTerm.app"
    "${pkgs.vscode}/Applications/Visual Studio Code.app"
  ];
}
