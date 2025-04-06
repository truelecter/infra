{
  lib,
  pkgs,
  ...
}: let
  username = "remote-builder";
in {
  users = {
    users.${username} =
      {
        openssh.authorizedKeys.keys = [
          (builtins.readFile ../../secrets/ssh/remote-builder.pub)
        ];
      }
      // lib.optionalAttrs (pkgs.stdenv.isLinux) {
        # nix-darwin does not have this properties
        isNormalUser = true;
        group = "remote-builders";
      };

    groups.remote-builders = {
      members = [username];
    };
  };

  nix.settings = {
    trusted-users = [username];
  };
}
