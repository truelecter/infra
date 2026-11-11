{
  config,
  lib,
  catalog,
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

    # BlueMap of every instance with BlueMap, also while it's stopped, at its
    # catalog service bluemap-<instance> (parts/catalog/services.nix).
    nginx = {
      enable = true;
      virtualHosts = lib.mapAttrs' (name: instance:
        lib.nameValuePair catalog.services."bluemap-${name}".fqdn {
          enableACME = true;
          forceSSL = true;
          locations."/".proxyPass = "http://127.0.0.1:${toString instance.bluemap.port}";
        }) (lib.filterAttrs (_: i: i.bluemap.enable) config.services.yanms.instances);
    };
  };

  networking.firewall.allowedTCPPorts = [
    80
    443
  ];
}
