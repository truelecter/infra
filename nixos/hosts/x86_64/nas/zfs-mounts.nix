{
  config,
  pkgs,
  ...
}: {
  services.zfs = {
    trim.enable = true;
    autoScrub.pools = ["tank"];
  };

  # Fix permissions
  systemd.tmpfiles.rules = [
    "d /tmp/cache 777 root root"
    "d /mnt/db 775 share share"
    "d /mnt/pv 775 share share"
    "d /mnt/nixarr 775 root root"
    "d /mnt/public 775 root media"
    "d /mnt/public/media 775 root media"
  ];

  fileSystems = {
    "/tmp/cache" = {
      device = "/dev/disk/by-label/cache";
      fsType = "ext4";
    };

    "/mnt/db" = {
      device = "tank/db";
      fsType = "zfs";
    };

    "/mnt/nixarr" = {
      device = "tank/nixarr";
      fsType = "zfs";
    };

    "/mnt/pv" = {
      device = "tank/pv";
      fsType = "zfs";
    };

    "/mnt/public/media" = {
      device = "tank/public/media";
      fsType = "zfs";
    };
  };

  users = {
    groups = {
      share = {
        gid = 10000;
      };
    };

    users = {
      share = {
        uid = 10000;
        isNormalUser = false;
        isSystemUser = true;
        group = "share";
      };
    };
  };
}
