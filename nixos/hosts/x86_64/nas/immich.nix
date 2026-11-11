# Photo library. Originals, thumbnails and Immich's nightly database dumps
# all live on the tank/photos dataset, so that one dataset is the backup unit.
{
  config,
  inputs,
  ...
}: let
  domain = "immich.xata.house";
  kanidmDomain = "auth.tlctr.me";
  mediaLocation = "/mnt/photos";
in {
  fileSystems.${mediaLocation} = {
    device = "tank/photos";
    fsType = "zfs";
  };

  systemd.tmpfiles.rules = [
    "d ${mediaLocation} 0700 immich immich"
  ];

  services.immich = {
    enable = true;
    inherit mediaLocation;
    # The default `localhost` makes the server listen on [::1] only.
    host = "127.0.0.1";

    # QuickSync for transcoding, OpenVINO on the iGPU for ML. `null` lifts
    # PrivateDevices so both services see /dev/dri.
    accelerationDevices = null;

    # Settings are read-only in the web UI while this is set.
    settings = {
      server.externalDomain = "https://${domain}";

      storageTemplate = {
        enabled = true;
        template = "{{y}}/{{y}}-{{MM}}-{{dd}}/{{filename}}";
      };

      ffmpeg = {
        # UHD 730 QuickSync, same as Jellyfin
        accel = "qsv";
        accelDecode = true;
      };

      oauth = {
        enabled = true;
        issuerUrl = "https://${kanidmDomain}/oauth2/openid/immich";
        clientId = "immich";
        clientSecret._secret = config.sops.secrets.immich-kanidm-oauth2-secret.path;
        scope = "openid email profile";
        tokenEndpointAuthMethod = "client_secret_basic";
        # Kanidm signs ID tokens with ES256
        signingAlgorithm = "ES256";
        roleClaim = "immich_role";
        buttonText = "Sign in with Kanidm";
        autoRegister = true;
        # Kanidm only accepts https redirects; Immich forwards this one to
        # app.immich:///oauth-callback.
        mobileOverrideEnabled = true;
        mobileRedirectUri = "https://${domain}/api/oauth/mobile-redirect";
      };
    };
  };

  systemd.services.immich-server.unitConfig.RequiresMountsFor = [mediaLocation];

  services.nginx.virtualHosts.${domain} = {
    forceSSL = true;
    useACMEHost = "xata.house";

    locations."/" = {
      proxyPass = "http://${config.services.immich.host}:${toString config.services.immich.port}";
      proxyWebsockets = true;
      recommendedProxySettings = true;
      extraConfig = ''
        client_max_body_size 50000M;
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
        send_timeout 600s;
      '';
    };
  };

  sops.secrets.immich-kanidm-oauth2-secret = {
    key = "oauth2/basic/immich";
    sopsFile = "${inputs.self}/secrets/kanidm.yaml";
  };
}
