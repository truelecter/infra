{
  pkgs,
  config,
  ...
}: let
  sCfg = config.tl.matrix;
in {
  nixpkgs.config.permittedInsecurePackages = [
    "olm-3.2.16"
  ];

  sops.secrets.mautrix-telegram = {
    sopsFile = ../../../../../../secrets/matrix/mautrix-telegram.env;
    key = "";
    format = "dotenv";
  };

  services.postgresql = {
    ensureUsers = [
      {
        name = "mautrix-telegram";
        ensureDBOwnership = true;
      }
    ];

    ensureDatabases = [
      "mautrix-telegram"
    ];
  };

  services.mautrix-telegram = {
    enable = true;

    # file containing the appservice and telegram tokens
    environmentFile = config.sops.secrets.mautrix-telegram.path;
    registerToSynapse = true;

    # The appservice is pre-configured to use SQLite by default.
    # It's also possible to use PostgreSQL.
    settings = {
      homeserver = {
        address = "http://localhost:8008";
        domain = sCfg.server-name;
      };

      appservice = {
        provisioning.enabled = false;
        id = "telegram";

        database = "postgresql:///mautrix-telegram?host=/run/postgresql";
      };

      bridge = {
        relaybot.authless_portals = false;
        permissions = {
          "@${sCfg.admin}:${sCfg.server-name}" = "admin";
        };

        # Animated stickers conversion requires additional packages in the
        # service's path.
        # If this isn't a fresh installation, clearing the bridge's uploaded
        # file cache might be necessary (make a database backup first!):
        # delete from telegram_file where \
        #   mime_type in ('application/gzip', 'application/octet-stream')
        animated_sticker = {
          target = "gif";
          args = {
            width = 256;
            height = 256;
            fps = 30; # only for webm
            background = "020202"; # only for gif, transparency not supported
          };
        };
      };
    };
  };

  systemd.services.mautrix-telegram.path = with pkgs; [
    lottieconverter # for animated stickers conversion, unfree package
    ffmpeg # if converting animated stickers to webm (very slow!)
  ];
}
