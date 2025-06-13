{
  pkgs,
  config,
  ...
}: let
  mDbCfg = config.services.matrix-synapse.settings.database.args;
in {
  services.postgresql = {
    enable = true;

    ensureUsers = [
      {
        name = mDbCfg.database;
        ensureDBOwnership = true;
      }
    ];

    ensureDatabases = [
      mDbCfg.database
    ];

    initialScript = pkgs.writeText "synapse-init.sql" ''
      CREATE ROLE "${mDbCfg.database}";
      CREATE DATABASE "${mDbCfg.database}" WITH OWNER "${mDbCfg.database}"
        TEMPLATE template0
        LC_COLLATE = "C"
        LC_CTYPE = "C";
    '';
  };
}
