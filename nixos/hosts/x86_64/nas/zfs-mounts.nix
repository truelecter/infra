{pkgs, ...}: {
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
    "d /mnt/media-server 775 root root"
    "d /mnt/public 775 root media"
    "d /mnt/public/media 775 root media"
  ];

  # /mnt/db and /mnt/media-server live on the system SSD: Postgres and the *arr
  # apps write every few seconds, which kept the pool disks from spinning down.
  # Their old datasets now hold the nightly copies (see the backup units below).
  fileSystems = {
    "/mnt/backup/db" = {
      device = "tank/db";
      fsType = "zfs";
    };

    "/mnt/nixarr" = {
      device = "tank/nixarr";
      fsType = "zfs";
    };

    "/mnt/backup/media-server" = {
      device = "tank/media-server";
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

  # Spin the pool disks down after 10 minutes without I/O (-S 120 = 120 * 5 s).
  services.udev.extraRules = ''
    ACTION=="add|change", SUBSYSTEM=="block", KERNEL=="sd[a-z]", ATTR{queue/rotational}=="1", RUN+="${pkgs.hdparm}/bin/hdparm -S 120 /dev/%k"
  '';

  # Nightly copy of the SSD-resident app state onto the pool.
  systemd.services.media-server-backup = {
    description = "Copy /mnt/media-server to the pool";
    startAt = "*-*-* 04:30:00";
    unitConfig.RequiresMountsFor = ["/mnt/media-server" "/mnt/backup/media-server"];
    serviceConfig.Type = "oneshot";
    script = "${pkgs.rsync}/bin/rsync -aHAX --delete /mnt/media-server/ /mnt/backup/media-server/";
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
