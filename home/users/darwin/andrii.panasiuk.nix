{
  pkgs,
  profiles,
  hmSuites,
  ...
}: {
  imports = [
    (import ./__common-gui.nix {username = "andrii.panasiuk";})
  ];

  home-manager.users."andrii.panasiuk" = {
    imports = hmSuites.workstation;
  };

  system.defaults.dock.persistent-apps = [
    "/Applications/Zen.app"
    # "/Applications/Arc.app"
    "/Applications/iTerm.app"
    "${pkgs.code-cursor}/Applications/Cursor.app"
    "/Applications/Telegram Desktop.app"
    "/Applications/Slack.app"
    "/System/Applications/Mail.app"
    "/System/Applications/Calendar.app"
    "/Applications/Cisco/Cisco Secure Client.app"
    "/Applications/OpenVPN Connect/OpenVPN Connect.app"
  ];
}
