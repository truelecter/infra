{config, ...}: let
  stateDir = "${config.nixarr.stateDir}/profilarr";
in {
  users = {
    groups.profilarr = {};

    users.profilarr = {
      group = "profilarr";
      isSystemUser = true;
    };
  };

  systemd.tmpfiles.rules = [
    "d ${stateDir} 0750 profilarr profilarr -"
  ];

  virtualisation.oci-containers.containers.profilarr = {
    image = "ghcr.io/dictionarry-hub/profilarr:2.0.8";

    volumes = [
      "${stateDir}:/config"
    ];

    ports = [
      "6868:6868"
    ];

    environment = {
      TZ = "Europe/Kyiv";
      PUID = toString config.users.users.profilarr.uid;
      PGID = toString config.users.groups.profilarr.gid;
      UMASK = "0002";
    };
  };
}
