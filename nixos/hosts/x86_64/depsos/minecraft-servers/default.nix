{
  config,
  lib,
  ...
}: {
  imports = [
    ./dawncraft.nix
    ./e6e.nix
    ./e9e.nix
    ./sevtech.nix
    ./vanilla.nix
    ./litv3.nix
    ./cae.nix
    ./vh3.nix
  ];

  users.users.truelecter.extraGroups = ["minecraft-servers"];

  services = {
    yanms = {
      eula = true;
      dataDir = "/srv/minecraft-servers";
      # Reads the restic secrets.
      users.extraGroups = ["minecraft-servers-backup"];

      backup.restic = {
        repositoryPrefix = "rclone:mega:/mc-backups";
        passwordFile = config.sops.secrets.minecraft-restic-pw-file.path;
        environmentFile = config.sops.secrets.minecraft-restic-env-file.path;
        initialize = true;
        pruneOpts = [
          "--keep-daily 3"
          "--keep-weekly 1"
        ];
      };
    };

    minecraft-server.serverProperties.server-port = 25580;

    # BlueMap of every running instance with BlueMap, as <instance>.tlctr.me.
    nginx = {
      enable = true;
      virtualHosts = lib.mapAttrs' (name: instance:
        lib.nameValuePair "${name}.tlctr.me" {
          enableACME = true;
          forceSSL = true;
          locations."/".proxyPass = "http://127.0.0.1:${toString instance.bluemap.port}";
        }) (lib.filterAttrs (_: i: i.enable && i.bluemap.enable) config.services.yanms.instances);
    };
  };

  networking.firewall.allowedTCPPorts = [
    80
    443
  ];
}
