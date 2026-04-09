{
  pkgs,
  profiles,
  hmSuites,
  config,
  ...
}: let
  username = "andrii.panasiuk";

  inherit (config.users.users.${username}) home;
in {
  imports = [
    (import ./__common-gui.nix {username = username;})
  ];

  home-manager.users.${username} = {
    imports = hmSuites.workstation;
  };

  system.defaults.dock.persistent-apps = [
    "/Applications/Zen.app"
    # "/Applications/Arc.app"
    "${home}/Applications/Home Manager Apps/Ghostty.app"
    "${home}/Applications/Home Manager Apps/Cursor.app"
    "/Applications/Telegram Desktop.app"
    "/Applications/Slack.app"
    "/System/Applications/Mail.app"
    "/System/Applications/Calendar.app"
    "/Applications/Cisco/Cisco Secure Client.app"
    "/Applications/OpenVPN Connect/OpenVPN Connect.app"
  ];
}
