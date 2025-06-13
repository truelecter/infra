# Taken from https://gitlab.kuca.cz/tom-kuca/nix-config/-/blob/main/modules/nixos/mautrix-discord.nix?ref_type=heads
{
  config,
  pkgs,
  lib,
  ...
}:
with lib; let
  dataDir = "/var/lib/mautrix-discord";
  registrationFile = "${dataDir}/discord-registration.yaml";
  cfg = config.services.mautrix-discord;
  settingsFormat = pkgs.formats.json {};
  settingsFile =
    settingsFormat.generate "mautrix-discord-config.json" cfg.settings;
in {
  options = {
    services.mautrix-discord = {
      enable =
        mkEnableOption (lib.mdDoc
          "Matrix Discord hybrid puppeting/relaybot bridge");

      registrationFile = mkOption {
        type = types.nullOr types.path;
        default = "/var/lib/matrix-bridge-registration/discord-registration.yaml";
        description = lib.mdDoc ''
          Appservice registration file, generated if not present. It should be outside nix store as it contains secret tokens.
        '';
      };

      registrationFileOwner = mkOption {
        type = types.nullOr types.str;
        default = config.systemd.services.matrix-synapse.serviceConfig.User;
        description = lib.mdDoc ''
          Owner of the appservice registration file, usually the user who is running the homeserver.
        '';
      };

      settings = mkOption rec {
        apply = recursiveUpdate default;
        inherit (settingsFormat) type;
        default = {
          homeserver = {software = "standard";};

          appservice = rec {
            database = "postgres:///mautrix-discord";
            database_opts = {};
            hostname = "0.0.0.0";
            port = 29334;
            address = "http://localhost:${toString port}";
          };

          bridge = {
            permissions."*" = "relaybot";
            relaybot.whitelist = [];
            double_puppet_server_map = {};
            login_shared_secret_map = {};
          };

          logging = {
            directory = "/var/log/mautrix-discord/";
            file_name_format = "{{.Date}}-{{.Index}}.log";
            file_date_format = "2006-01-02";
            file_mode = 384;
            timestamp_format = "Jan _2, 2006 15:04:05";
            print_level = "debug";
            print_json = false;
            file_json = false;
          };
        };
        example = literalExpression ''
          {
            homeserver = {
              address = "http://localhost:8008";
              domain = "public-domain.tld";
            };
            appservice.public = {
              prefix = "/public";
              external = "https://public-appservice-address/public";
            };
            bridge.permissions = {
              "example.com" = "full";
              "@admin:example.com" = "admin";
            };
          }
        '';
        description = lib.mdDoc ''
          {file}`config.yaml` configuration as a Nix attribute set.
          Configuration options should match those described in
          [example-config.yaml](https://github.com/mautrix/discord/blob/master/mautrix_discord/example-config.yaml).
        '';
      };

      serviceDependencies = mkOption {
        type = with types; listOf str;
        default =
          optional config.services.matrix-synapse.enable
          "matrix-synapse.service";
        defaultText = literalExpression ''
          optional config.services.matrix-synapse.enable "matrix-synapse.service"
        '';
        description = lib.mdDoc ''
          List of Systemd services to require and wait for when starting the application service.
        '';
      };
    };
  };

  config = mkIf cfg.enable {
    environment.systemPackages = with pkgs; [mautrix-discord];

    users.users.mautrix-discord = {
      isSystemUser = true;
      group = "mautrix-discord";
      home = dataDir;
      description = "Mautrix-Discord bridge user";
    };

    users.groups.mautrix-discord = {};

    systemd.services.mautrix-discord = {
      description = "Mautrix-discord, a Matrix-discord hybrid puppeting/relaybot bridge.";

      wantedBy = ["multi-user.target"];
      wants = ["network-online.target"] ++ cfg.serviceDependencies;
      after = ["network-online.target"] ++ cfg.serviceDependencies;
      # preStart =
      #   ''
      #     # generate the appservice's registration file if absent
      #     if [ ! -f '${registrationFile}' ]; then
      #       cp ${settingsFile} /tmp/mautrix-discord-config.json
      #       chmod u+w /tmp/mautrix-discord-config.json
      #       ${pkgs.mautrix-discord}/bin/mautrix-discord \
      #         --generate-registration \
      #         --config='/tmp/mautrix-discord-config.json' \
      #         --registration='${registrationFile}'
      #     fi
      #   '';

      serviceConfig = {
        Type = "simple";
        Restart = "always";

        User = "mautrix-discord";
        Group = "mautrix-discord";

        ExecStart = "${pkgs.mautrix-discord}/bin/mautrix-discord -c ${settingsFile} --no-update";
        # ExecStartPre = [
        #   "+${pkgs.coreutils}/bin/mkdir -p /var/log/mautrix-discord"
        #   "+${pkgs.coreutils}/bin/chown mautrix-discord:mautrix-discord /var/log/mautrix-discord"
        #
        #   #   "+${pkgs.coreutils}/bin/mkdir -p '${builtins.dirOf cfg.registrationFile}'"
        #   #   "+${pkgs.coreutils}/bin//chown ${cfg.registrationFileOwner} '${builtins.dirOf cfg.registrationFile}'"
        #   #   "+${pkgs.coreutils}/bin/mv '${registrationFile}' '${cfg.registrationFile}'"
        #   #   "+${pkgs.coreutils}/bin/chown ${cfg.registrationFileOwner} '${cfg.registrationFile}'"
        # ];
        ProtectSystem = "strict";
        ProtectHome = true;
        ProtectKernelTunables = true;
        ProtectKernelModules = true;
        ProtectControlGroups = true;

        # DynamicUser = true;
        PrivateTmp = true;
        WorkingDirectory = dataDir;
        StateDirectory = baseNameOf dataDir;
        UMask = "0027";

        # Logs directory and mode
        LogsDirectory = "mautrix-discord";
        LogsDirectoryMode = "0755";

        # LockPersonality = true;
        # MemoryDenyWriteExecute = true;
        # NoNewPrivileges = true;
        # PrivateDevices = true;
        # PrivateUsers = true;
        # ProtectClock = true;
        # ProtectHostname = true;
        # ProtectKernelLogs = true;
        # RestartSec = "30s";
        # RestrictRealtime = true;
        # RestrictSUIDSGID = true;
        # SystemCallArchitectures = "native";
        # SystemCallErrorNumber = "EPERM";
        # SystemCallFilter = [ "@system-service" ];
      };
    };
  };
}
