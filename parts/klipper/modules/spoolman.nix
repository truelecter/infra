{
  config,
  pkgs,
  lib,
  ...
}: let
  l = builtins // lib;

  inherit (l) mkEnableOption types mkOption;

  cfg = config.tl.services.spoolman;

  defaultUser = "spoolman";
in {
  options.tl.services.spoolman = {
    enable = mkEnableOption "Spoolman helps to keep track of your inventory of 3D-printer filament spools";

    package = mkOption {
      type = types.package;
      default = pkgs.spoolman;
      defaultText = l.literalExpression "pkgs.spoolman";
      description = "Spoolman package to use";
    };

    dataDir = mkOption {
      type = types.str;
      default = "/var/lib/spoolman";
      description = "Directory to store the Spoolman server data.";
    };

    user = mkOption {
      type = types.str;
      default = defaultUser;
      description = "User under which Spoolman server runs.";
    };

    host = mkOption {
      type = types.str;
      default = "127.0.0.1";
      description = "Host to listen on.";
    };

    port = mkOption {
      type = types.nullOr types.port;
      default = 7912;
      description = "Port to listen on.";
    };
  };

  config = l.mkIf cfg.enable {
    systemd.tmpfiles.rules = [
      "d '${cfg.dataDir}' - ${cfg.user} ${config.users.users.${cfg.user}.group} - -"
    ];

    users = l.optionalAttrs (cfg.user == defaultUser) {
      users.${defaultUser} = {
        isSystemUser = true;
        group = defaultUser;
        home = cfg.dataDir;
      };

      groups.${defaultUser} = {};
    };

    systemd.services.spoolman = {
      description = "Spoolman server";
      after = ["network.target" "systemd-tmpfiles-setup.service"];
      path = [cfg.package.pythonEnv];
      wantedBy = ["multi-user.target"];

      serviceConfig = {
        User = cfg.user;
        Restart = "always";
        WorkingDirectory = "${cfg.package}/lib/spoolman/";
      };

      environment = {
        SPOOLMAN_DIR_DATA = cfg.dataDir;
      };

      script = let
        networking = "--host ${cfg.host} --port ${toString cfg.port}";
      in ''
        ${cfg.package.pythonEnv}/bin/uvicorn ${networking} \
            --app-dir ${cfg.package}/lib/spoolman/ \
            spoolman.main:app
      '';
    };
  };
}
