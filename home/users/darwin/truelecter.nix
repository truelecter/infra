{
  pkgs,
  hmSuites,
  sshKeys,
  config,
  ...
}: let
  username = "truelecter";

  inherit (config.users.users.${username}) home;
in {
  imports = [
    (import ./__common-gui.nix {username = username;})
  ];

  home-manager.users.${username} = {
    imports = hmSuites.base;
  };

  users.users.${username} = {
    openssh.authorizedKeys.keys = sshKeys;
  };

  system.defaults.dock.persistent-apps = [
    "/Applications/Zen.app"
    "${home}/Applications/Home Manager Apps/Ghostty.app"
    "${pkgs.vscode}/Applications/Visual Studio Code.app"
  ];
}
