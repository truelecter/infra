{
  config,
  inputs,
  pkgs,
  ...
}: let
  atticPort = "8502";
  domainName = "nix-cache.tlctr.me";
  storagePath = "/cache/attic";
in {
  services.nginx = {
    enable = true;

    virtualHosts.${domainName} = {
      # useACMEHost = domainName;
      enableACME = true;
      forceSSL = true;
      kTLS = true;

      locations."/" = {
        proxyPass = "http://localhost:${atticPort}/";
      };

      extraConfig = ''
        client_max_body_size 0;
      '';
    };
  };

  services.atticd = {
    enable = true;

    package = pkgs.attic-server-chunking;

    environmentFile = config.sops.templates."attic/env".path;

    settings = {
      listen = "127.0.0.1:${atticPort}";

      api-endpoint = "https://${domainName}/";

      allowed-hosts = [
        domainName
        "localhost:${atticPort}"
        "127.0.0.1:${atticPort}"
      ];

      database = {
        url = "postgresql:///attic?host=/run/postgresql&user=attic";
      };

      storage = {
        type = "local";
        path = storagePath;
      };

      chunking = {
        nar-size-threshold = 65536;
        min-size = 16384;
        avg-size = 65536;
        max-size = 262144;
      };

      compression = {
        type = "none";
        level = 1;
      };

      garbage-collection = {
        interval = "1 month";
        default-retention-period = "3 months";
      };
    };
  };

  services.postgresql = {
    ensureDatabases = ["attic"];
    ensureUsers = [
      {
        name = "attic";
        ensureDBOwnership = true;
      }
    ];
  };

  sops.secrets = {
    "attic_jwt_secret_base64" = {
      sopsFile = "${inputs.self}/secrets/nix-caches.yaml";
      owner = "root";
      group = "root";
      mode = "0400";
    };
  };

  sops.templates."attic/env" = {
    content = ''
      ATTIC_SERVER_TOKEN_RS256_SECRET_BASE64=${config.sops.placeholder.attic_jwt_secret_base64}
    '';

    owner = "root";
    group = "root";
  };

  systemd.tmpfiles.rules = [
    "d ${storagePath} 0755 ${config.services.atticd.user} ${config.services.atticd.group} -"
  ];

  environment.systemPackages = [
    pkgs.attic-client
  ];
}
