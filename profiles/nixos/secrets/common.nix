{
  inputs,
  lib,
  config,
  ...
}: {
  imports = [
    inputs.sops-nix.nixosModules.sops
  ];

  sops.secrets = {
    root-password = {
      key = "root-password";
      sopsFile = "${inputs.self}/secrets/nixos-common.yaml";
      neededForUsers = true;
    };
  };

  users.users.root = {
    uid = 0;
    hashedPasswordFile = config.sops.secrets.root-password.path;
  };

  sops.gnupg.sshKeyPaths = lib.mkDefault [
    "/etc/ssh/ssh_host_rsa_key"
  ];
}
