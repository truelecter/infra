{
  config,
  modulesPath,
  inputs,
  ...
}: let
  ncpsPort = "8501";
  domainName = "nix-proxy.tlctr.me";
in {
  disabledModules = [
    "${modulesPath}/services/networking/ncps.nix"
  ];

  imports = [
    ./ncps-module-backport.nix
  ];

  services.nginx = {
    enable = true;

    virtualHosts.${domainName} = {
      # useACMEHost = domainName;
      enableACME = true;
      forceSSL = true;
      kTLS = true;

      locations."/" = {
        proxyPass = "http://localhost:${ncpsPort}/";
      };
    };
  };

  services.ncps = {
    enable = true;

    netrcFile = config.sops.templates.ncps_netrc.path;

    cache = {
      hostName = domainName;
      databaseURL = "postgres:///ncps?host=/run/postgresql&sslmode=disable";

      secretKeyPath = config.sops.secrets.ncps_key.path;

      storage.local = "/cache/ncps/storage";
      tempPath = "/cache/ncps/temp";
      maxSize = "250G";

      lru.schedule = "0 3 * * 6";

      upstream = let
        caches = import ./external-caches.nix;
      in {
        urls =
          (
            builtins.map (c: c.url) caches
          )
          ++ [
            "http://${config.services.atticd.settings.listen}/workflows"
          ];

        publicKeys =
          (
            builtins.map (c: c.pubKey) caches
          )
          ++ [
            "workflows:LrcQCsRv7P/HRuE10RyaNGM/6qsPchf+xaUOcFLy/5E=" # View by issuing "attic cache info workflows"
          ];
      };
    };
  };

  services.postgresql = {
    ensureDatabases = ["ncps"];
    ensureUsers = [
      {
        name = "ncps";
        ensureDBOwnership = true;
      }
    ];
  };

  sops.secrets = {
    ncps_key = {
      sopsFile = "${inputs.self}/secrets/nix-caches.yaml";
      mode = "0400";
      group = "ncps";
      owner = "ncps";
      key = "ncps-key";
    };

    ncps_attic_key = {
      sopsFile = "${inputs.self}/secrets/nix-caches.yaml";
      mode = "0400";
      group = "ncps";
      owner = "ncps";
      key = "ncps-attic-key";
    };
  };

  sops.templates.ncps_netrc = {
    content = ''
      machine 127.0.0.1
      password ${config.sops.placeholder.ncps_attic_key}
    '';

    group = "ncps";
    owner = "ncps";
  };
}
