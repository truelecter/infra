{
  lib,
  config,
  inputs,
  ...
}: let
  web-container-port = "8911";
  domainName = "data.fenrir.moe";
in {
  imports = [./redeploy.nix];

  services.nginx = {
    enable = true;

    virtualHosts.${domainName} = {
      # useACMEHost = domainName;
      enableACME = true;
      forceSSL = true;
      kTLS = true;
      default = true;

      locations."/" = {
        proxyPass = "http://localhost:${web-container-port}/";
      };
    };
  };

  # security.acme.certs.${domainName} = {};

  # TODO: if this is ever needed, convert to plain nix service
  virtualisation.oci-containers.containers = {
    # Default podman bridge network: outbound access for Discord, Postgres on the host via host.containers.internal
    pandora = {
      image = "ghcr.io/cq-pandora/assets:bot";
      # The cq-pandora/assets workflow republishes the same tag; fetch it on every (re)start
      pull = "newer";
      extraOptions = [
        "--cap-drop=all"
        "--security-opt=no-new-privileges"
        "--read-only"
        "--tmpfs=/tmp"
        "--memory=1g"
        "--pids-limit=256"
      ];

      volumes = lib.pipe ./configs [
        builtins.readDir
        builtins.attrNames
        (map (d: "${./configs/${d}}:/opt/pandora-overrides/${d}:ro"))
      ];

      environment = {
        NODE_ENV = "production";

        PANDORA_OWNER_ID = "136069690446446592"; # That is me :)
        PANDORA_APPLICATION_ID = "482249831709016064";

        PANDORA_DB_DATABASE = "cqdata";
        PANDORA_DB_PORT = "5432";
        PANDORA_DB_HOST = "host.containers.internal";
        PANDORA_DB_SCHEMA = "public";

        PANDORA_URL_IMAGES_PREFIX = "https://data.fenrir.moe/";
        PANDORA_OVERRIDES_PATH = "/opt/pandora-overrides/";
        PANDORA_LOCAL_IMAGES_PREFIX = "/cq-data/";
        PANDORA_CQ_NORMALIZED_DATA_PATH = "/cq-data/information";
      };

      environmentFiles = [
        config.sops.secrets.pandora-envs.path
      ];
    };

    pandora-web-resources = {
      image = "ghcr.io/cq-pandora/assets:web";
      pull = "newer";
      ports = [
        "127.0.0.1:${web-container-port}:80"
      ];
      # nginx starts as root to switch its workers to nobody; everything else is dropped
      extraOptions = [
        "--cap-drop=all"
        "--cap-add=CHOWN,DAC_OVERRIDE,SETGID,SETUID,NET_BIND_SERVICE"
        "--security-opt=no-new-privileges"
        "--read-only"
        "--tmpfs=/run/nginx"
        "--tmpfs=/var/lib/nginx/tmp"
        "--tmpfs=/var/log/nginx"
        "--memory=256m"
        "--pids-limit=64"
      ];
    };
  };

  # The bot's role: owns cqdata and logs in with the password from pandora-envs
  systemd.services.pandora-db-role = {
    description = "Set up the pandora Postgres role";
    after = ["postgresql-setup.service"];
    requires = ["postgresql-setup.service"];
    before = ["podman-pandora.service"];
    requiredBy = ["podman-pandora.service"];
    serviceConfig = {
      Type = "oneshot";
      RemainAfterExit = true;
      User = "postgres";
      EnvironmentFile = config.sops.secrets.pandora-envs.path;
    };
    script = ''
      ${config.services.postgresql.package}/bin/psql --no-psqlrc -v ON_ERROR_STOP=1 <<'SQL'
      \getenv password PANDORA_DB_PASSWORD
      ALTER ROLE pandora PASSWORD :'password';
      ALTER DATABASE cqdata OWNER TO pandora;
      \connect cqdata
      ALTER SCHEMA public OWNER TO pandora;
      -- Sequences owned by a column follow their table
      SELECT format('ALTER TABLE public.%I OWNER TO pandora', c.relname)
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'v', 'm', 'S')
        AND pg_get_userbyid(c.relowner) <> 'pandora'
        AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid = 'pg_class'::regclass AND d.objid = c.oid AND d.deptype IN ('a', 'i'))
      \gexec
      SQL
    '';
  };

  sops.secrets.pandora-envs = {
    sopsFile = "${inputs.self}/secrets/bots/pandora-envs.env";
    key = "";
    format = "dotenv";
    restartUnits = ["pandora-db-role.service" "podman-pandora.service"];
  };
}
