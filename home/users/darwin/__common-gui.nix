{username}: {
  pkgs,
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
        profiles.home.darwin.shell.iterm
        profiles.home.darwin.smart-card-fix
      ];

    # home.packages = [
    #   pkgs.zen
    #   pkgs.code-cursor
    # ];

    home.stateVersion = "24.11";
  };

  # TODO: find a way to work with 1password and home manager packages linking
  homebrew.casks = ["zen"];

  system.defaults.dock.persistent-others = [];

  system.defaults.screencapture.location = "${home}/Documents/Captures";

  users.groups.keys.members = [username];

  home-manager.backupFileExtension = ".bak";
}
