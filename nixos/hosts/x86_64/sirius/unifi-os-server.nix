{
  config,
  lib,
  pkgs,
  ...
}: let
  stateDir = user.home;

  # MongoDB needs writable log and data dirs; + runs as root regardless of User=
  mongoPreStartFix = pkgs.writeText "mongodb-prestart-fix.conf" ''
    [Service]
    ExecStartPre=+/bin/chown mongodb:mongodb /var/log/mongodb /var/lib/mongodb"
  '';

  dbusStartFix = pkgs.writeText "dbus-start-fix.conf" ''
    <?xml version="1.0" encoding="UTF-8"?>
    <!DOCTYPE busconfig SYSTEM "busconfig.dtd">
    <busconfig>
        <apparmor mode="disabled"/>
    </busconfig>
  '';

  name = "unifi-os-server";
  user = config.users.users.${name};

  image = pkgs.unifi-os-server-image;

  imageManifest = lib.importJSON image.manifest;
in {
  virtualisation.oci-containers.containers.${name} = {
    image = lib.lists.head (lib.lists.head imageManifest).RepoTags;
    imageFile = image;
    pull = "never";

    volumes = [
      "${stateDir}/persistent:/persistent"
      "${stateDir}/log:/var/log"
      "${stateDir}/data:/data"
      "${stateDir}/srv:/srv"
      "${stateDir}/unifi:/var/lib/unifi"
      "${stateDir}/mongodb:/var/lib/mongodb"
      "${mongoPreStartFix}:/etc/systemd/system/mongodb.service.d/prestart-fix.conf:ro"
      "${dbusStartFix}:/etc/dbus-1/system.d/start-fix.conf:ro"
      "${dbusStartFix}:/etc/dbus-1/session.d/start-fix.conf:ro"
    ];

    environment = {
      # UOS_SYSTEM_IP = "10.3.0.129";
      UOS_SYSTEM_IP = "127.0.0.1";
      UOS_SERVER_VERSION = image.version;
      FIRMWARE_PLATFORM = "linux-x64";
    };

    extraOptions = [
      "--systemd=always"
    ];

    ports = [
      "11443:443"
      "8080:8080"
      "8443:8443"
      "3478:3478/udp"
    ];

    privileged = true;
  };

  systemd.services."podman-${name}" = {
    preStart = lib.mkAfter ''
      ${pkgs.coreutils}/bin/mkdir -p ${stateDir}/{persistent,log,data,srv,unifi,mongodb,data/unifi-core/config/http,log/nginx,log/mongodb}

      # The Java UniFi controller requires exactly UUID v5 (SHA-1 name-based).
      # Generate a stable v5 UUID derived from the machine-id.
      uuid_file="${stateDir}/data/uos_uuid"
      if [ ! -f "$uuid_file" ]; then
        ${pkgs.util-linux}/bin/uuidgen -s -n @dns -N "$(${pkgs.coreutils}/bin/cat /etc/machine-id)" > "$uuid_file"
      fi
    '';
  };

  users.users."${name}" = {
    isSystemUser = true;
    group = name;
    autoSubUidGidRange = true;
    home = "/var/lib/${name}";
    createHome = true;
  };
  users.groups."${name}" = {};

  systemd.tmpfiles.rules = [
    "d '${user.home}' 0775 ${user.name} ${user.group} - -"
  ];
}
