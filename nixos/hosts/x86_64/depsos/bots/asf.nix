{config, ...}: let
  asfPort = "1242";
  domainName = "asf.tenma.moe";
in {
  services.nginx = {
    enable = true;

    virtualHosts.${domainName} = {
      # useACMEHost = domainName;
      enableACME = true;
      forceSSL = true;
      kTLS = true;

      locations."/" = {
        proxyPass = "http://localhost:${asfPort}/";
      };
    };
  };

  # security.acme.certs.${domainName} = {};

  services.archisteamfarm = let
    inherit (config.sops.secrets) asf-tl-pw asf-oni-pw ipc-pw;
  in {
    enable = true;
    web-ui.enable = true;

    settings = {
      "SteamOwnerID" = 76561198328774937;
    };

    ipcPasswordFile = ipc-pw.path;
    ipcSettings = {
      "Kestrel" = {
        "Endpoints" = {
          "HTTP" = {
            "Url" = "http://*:${asfPort}";
          };
        };
        "KnownNetworks" = [
          "10.0.0.0/8"
          "172.16.0.0/12"
          "192.168.0.0/16"
        ];
        "PathBase" = "/";
      };
    };

    bots = let
      mkBot = username: passwordFile: {
        enabled = true;

        inherit username passwordFile;

        settings = {
          "AcceptGifts" = true;
          "AutoSteamSaleEvent" = true;
          "BotBehaviour" = 1;
          "CustomGamePlayedWhileFarming" = "Idling cards";
          "CustomGamePlayedWhileIdle" = "Not idling cards=)";
          "Enabled" = true;
          "FarmingOrders" = [
            13
          ];
          "OnlineStatus" = 7;
          "SteamLogin" = username;
        };
      };
    in {
      tl = mkBot "_truelecter_" asf-tl-pw.path;
      oni = mkBot "papochka1234" asf-oni-pw.path;
    };
  };

  environment.etc."flake".source = ../../../../.;

  sops.secrets = let
    inherit (config.services.archisteamfarm) dataDir;

    sopsFile = ../../../../../secrets/bots/archi-steam-farm.yaml;
    owner = "archisteamfarm";
  in {
    asf-tl-pw = {
      inherit sopsFile owner;
      key = "truelecter-pw";
    };

    asf-tl-mafile = {
      inherit sopsFile owner;
      key = "truelecter-mafile";
      path = "${dataDir}/config/tl.maFile";
    };

    asf-oni-pw = {
      inherit sopsFile owner;
      key = "oni-pw";
    };

    asf-oni-mafile = {
      inherit sopsFile owner;
      key = "oni-mafile";
      path = "${dataDir}/config/oni.maFile";
    };

    ipc-pw = {
      inherit sopsFile owner;
      key = "ipc-pw";
    };
  };
}
