{
  config,
  lib,
  ...
}: let
  sCfg = config.tl.matrix;

  discordBridgePort = toString config.services.mautrix-discord.settings.appservice.port;
in {
  sops.secrets.mautrix-discord = {
    sopsFile = ../../../../../../secrets/matrix/mautrix-discord.env;
    key = "";
    format = "dotenv";
  };

  services.postgresql = {
    ensureUsers = [
      {
        name = "mautrix-discord";
        ensureDBOwnership = true;
      }
    ];

    ensureDatabases = [
      "mautrix-discord"
    ];
  };

  services.mautrix-discord = {
    enable = true;

    environmentFile = config.sops.secrets.mautrix-discord.path;
    registerToSynapse = true;

    settings = {
      homeserver = {
        address = "http://localhost:8008";
        domain = sCfg.server-name;
      };

      appservice = {
        id = "discord";
        port = 8009;
        address = "http://localhost:${toString discordBridgePort}";

        bot = {
          username = "discordbot";
          displayname = "Discord bridge bot";
          avatar = "mxc://maunium.net/nIdEykemnwdisvHbpxflpDlC";
        };

        # These will be generated automatically
        as_token = "generate";
        hs_token = "generate";

        database = {
          uri = "postgres:///mautrix-discord?host=/run/postgresql&sslmode=disable";
        };
      };

      bridge = {
        direct-media = {
          server_name = "discord-media.${sCfg.server-name}";
        };

        permissions = {
          "@${sCfg.admin}:${sCfg.server-name}" = "admin";
        };

        login_shared_secret_map = {
          ${sCfg.server-name} = "$MAUTRIX_DISCORD_BRIDGE_DOUBLE_PUPPET_SECRET";
        };
      };
    };
  };

  services.nginx.virtualHosts."discord-media.${sCfg.server-name}" = {
    enableACME = true;
    forceSSL = true;

    locations."/" = {
      proxyPass = "http://localhost:${discordBridgePort}";
      extraConfig = ''
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
      '';
    };
  };
}
