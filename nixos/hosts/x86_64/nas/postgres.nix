{pkgs, ...}: {
  i18n.supportedLocales = [
    "uk_UA.UTF-8/UTF-8"
    "en_US.UTF-8/UTF-8"
  ];

  systemd.tmpfiles.rules = [
    "d /mnt/db/pg-15 750 postgres postgres"
  ];

  services.postgresql = {
    enable = true;
    package = pkgs.postgresql_15;
    enableTCPIP = true;
    dataDir = "/mnt/db/pg-15";
    ensureDatabases = [
      "memebot"
    ];
    identMap = ''
      map-name truelecter truelecter
      map-name dagerpmc memebot
    '';
    ensureUsers = [
      {
        name = "memebot";
        ensureDBOwnership = true;
        ensureClauses.login = true;
      }
      {
        name = "truelecter";
        ensureClauses.superuser = true;
      }
    ];
    authentication = pkgs.lib.mkOverride 10 ''
      local all all trust
      host all all 127.0.0.1/32 trust
      host all all 100.0.0.0/8 trust
      host all all 10.0.0.0/8 trust
    '';
  };

  # Nightly dump onto the pool; the live cluster sits on the system SSD.
  services.postgresqlBackup = {
    enable = true;
    backupAll = true;
    location = "/mnt/backup/db/dumps";
    startAt = "*-*-* 04:00:00";
    compression = "zstd";
  };
  systemd.services.postgresqlBackup.unitConfig.RequiresMountsFor = ["/mnt/backup/db"];
}
