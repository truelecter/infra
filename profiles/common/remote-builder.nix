let
  username = "remote-builder";
in {
  users = {
    users.${username} = {
      group = "remote-builders";
      isSystemUser = true;

      openssh.authorizedKeys.keys = [
        (builtins.readFile ../../secrets/ssh/remote-builder.pub)
      ];
    };
    groups.remote-builders = {};
  };

  nix.settings = {
    trusted-users = [username];
  };
}
