{username}: {
  hmSuites,
  profiles,
  config,
  ...
}: let
  inherit (config.users.users.${username}) home;
in {
  home-manager.users.${username} = {
    imports =
      hmSuites.git
      ++ [
        profiles.home.shell.ghostty
        profiles.home.darwin.gpg
        profiles.home.darwin.associations
        profiles.home.zen
      ];

    home.stateVersion = "25.11";
  };

  system.defaults.dock.persistent-others = [];

  system.defaults.screencapture.location = "${home}/Documents/Captures";

  users.groups.keys.members = [username];

  home-manager.backupFileExtension = ".bak";
}
