{
  lib,
  config,
  ...
}: let
  web-container-port = "8911";
  domainName = "data.fenrir.moe";
in {
  services.nginx = {
    enable = true;

    virtualHosts.${domainName} = {
      # useACMEHost = domainName;
      enableACME = true;
      forceSSL = true;
      kTLS = true;

      locations."/" = {
        proxyPass = "http://localhost:${web-container-port}/";
      };
    };
  };

  # security.acme.certs.${domainName} = {};

  # TODO: if this is ever needed, convert to plain nix service
  virtualisation.oci-containers.containers = {
    pandora = {
      image = "ghcr.io/cq-pandora/assets:bot";
      extraOptions = ["--network=host"]; # TODO: make it more secure (connect to host.docker.internal with --add-host=host.docker.internal:host-gateway)

      volumes = lib.pipe ./configs [
        builtins.readDir
        builtins.attrNames
        (builtins.map (d: "${./configs/${d}}:/opt/pandora-overrides/${d}"))
      ];

      environment = {
        NODE_ENV = "production";

        PANDORA_OWNER_ID = "136069690446446592"; # That is me :)
        PANDORA_APPLICATION_ID = "482249831709016064";

        PANDORA_DB_DATABASE = "cqdata";
        PANDORA_DB_PORT = "5432";
        PANDORA_DB_HOST = "depsos";
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
      ports = [
        "127.0.0.1:${web-container-port}:80"
      ];
    };
  };

  sops.secrets.pandora-envs = {
    sopsFile = ../../../../../../secrets/bots/pandora-envs.env;
    key = "";
    format = "dotenv";
  };
}
