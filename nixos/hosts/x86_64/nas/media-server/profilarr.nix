{config, ...}: let
  stateDir = "${config.nixflix.stateDir}/profilarr";

  # Fixed, so the container gets real PUID/PGID values. These are the ids the
  # system allocated when the user was first created.
  uid = 990;
  gid = 982;
in {
  users = {
    groups.profilarr = {inherit gid;};

    users.profilarr = {
      inherit uid;
      group = "profilarr";
      isSystemUser = true;
    };
  };

  systemd.tmpfiles.rules = [
    "d ${stateDir} 0750 profilarr profilarr -"
  ];

  virtualisation.oci-containers.containers.profilarr = {
    image = "ghcr.io/dictionarry-hub/profilarr:2.2.0";

    volumes = [
      "${stateDir}:/config"
    ];

    ports = [
      "6868:6868"
    ];

    environment = {
      TZ = "Europe/Kyiv";
      PUID = toString uid;
      PGID = toString gid;
      UMASK = "0002";
    };
  };
}
