{
  pkgs,
  profiles,
  hmSuites,
  sshKeys,
  ...
}: {
  imports = [
    (import ./__common-gui.nix {username = "truelecter";})
  ];

  home-manager.users.truelecter = {
    imports = hmSuites.base;
  };

  users.users.truelecter = {
    openssh.authorizedKeys.keys = sshKeys;
  };

  system.defaults.dock.persistent-apps = [
    "/Applications/Zen.app"
    # "/Applications/Arc.app"
    "/Applications/iTerm.app"
    "${pkgs.vscode}/Applications/Visual Studio Code.app"
  ];
}
