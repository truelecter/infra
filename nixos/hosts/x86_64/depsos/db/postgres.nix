{pkgs, ...}: {
  i18n.supportedLocales = [
    "uk_UA.UTF-8/UTF-8"
    "en_US.UTF-8/UTF-8"
  ];

  services.postgresql = {
    enable = true;
    package = pkgs.postgresql_16;
    enableTCPIP = true;
    dataDir = "/srv/db/pg-16";
    ensureDatabases = [
      "cqdata"
      "authentik"
    ];
    identMap = ''
      map-name truelecter truelecter
    '';
    ensureUsers = [
      {
        name = "pandora";
        # ensurePermissions = {
        #   "DATABASE cqdata" = "ALL PRIVILEGES";
        # };
      }
      {
        name = "authentik";
        # ensurePermissions = {
        #   "DATABASE authentik" = "ALL PRIVILEGES";
        # };
      }
      {
        name = "truelecter";
        # ensurePermissions = {
        #   "ALL TABLES IN SCHEMA public" = "ALL PRIVILEGES";
        #   "DATABASE cqdata" = "ALL PRIVILEGES";
        # };
      }
      {
        name = "superuser";
        # ensurePermissions = {
        #   "ALL TABLES IN SCHEMA public" = "ALL PRIVILEGES";
        # };
      }
    ];
    authentication = pkgs.lib.mkOverride 10 ''
      local all all trust
      host all all 127.0.0.1/32 trust
      host all all 100.0.0.0/8 trust
      host all all 10.0.0.0/8 trust
    '';
  };
}
