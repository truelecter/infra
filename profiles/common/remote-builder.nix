{
  lib,
  pkgs,
  config,
  ...
}: let
  username = "remote-builder";
  groupname = "remote-builders";
  defaultUid = 399;
  defaultGid = 32001;
in {
  users =
    {
      users.${username} =
        {
          openssh.authorizedKeys.keys = [
            (builtins.readFile ../../secrets/ssh/remote-builder.pub)
          ];
        }
        // lib.optionalAttrs (pkgs.stdenv.isLinux) {
          group = groupname;
          # nix-darwin does not have this properties
          isNormalUser = true;
        }
        // lib.optionalAttrs (pkgs.stdenv.isDarwin) {
          uid = lib.mkDefault defaultUid;
          gid = lib.mkDefault config.users.groups.${groupname}.gid;
          createHome = true;
          shell = "/bin/zsh";
          home = "/Users/${username}";
        };

      groups.${groupname} =
        {
          members = [username];
        }
        // lib.optionalAttrs (pkgs.stdenv.isDarwin) {
          gid = lib.mkDefault defaultGid;
        };
    }
    // lib.optionalAttrs (pkgs.stdenv.isDarwin) {
      knownUsers = [username];
      knownGroups = [groupname];
    };

  nix.settings = {
    trusted-users = [username];
  };

  system = lib.optionalAttrs (pkgs.stdenv.isDarwin) {
    activationScripts.postActivation.text = ''
      # Allow remote builder to access ssh
      dseditgroup -o edit -a ${username} -t user com.apple.access_ssh
    '';
  };
}
