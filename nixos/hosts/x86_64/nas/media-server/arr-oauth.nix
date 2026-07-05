{
  lib,
  inputs,
  config,
  ...
}: let
  mediaBaseDomain = "xata.house";
  kanidmDomain = "auth.tlctr.me";
in {
  services.nginx.virtualHosts."arr.${mediaBaseDomain}" = {
    forceSSL = true;
    useACMEHost = mediaBaseDomain;
  };

  services.oauth2-proxy = let
    clientId = "arr";
  in {
    enable = true;

    provider = "oidc";
    scope = "openid email";

    loginURL = "https://${kanidmDomain}/ui/oauth2";
    redeemURL = "https://${kanidmDomain}/oauth2/token";
    validateURL = "https://${kanidmDomain}/oauth2/openid/${clientId}/userinfo";
    redirectURL = "https://arr.${mediaBaseDomain}/oauth2/callback";

    clientID = clientId;
    clientSecretFile = config.sops.secrets.kanidm-oauth2-arr.path;

    cookie = {
      # tr --complement --delete 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkpqrstuvwxyz0123456789' < /dev/urandom | head --bytes 32
      secretFile = config.sops.secrets.kanidm-oauth2-arr-cookie.path;
      expire = "30m";
      secure = true;
      domain = ".${mediaBaseDomain}";
    };

    email.domains = ["*"];

    reverseProxy = true;
    nginx = {
      domain = "arr.${mediaBaseDomain}";
      virtualHosts = let
        arrs = ["sonarr" "radarr" "sonarr-anime" "prowlarr" "qbittorrent"];
      in
        lib.mkMerge (
          map (
            arr: {
              "${arr}.${mediaBaseDomain}" = {
                allowed_groups = [
                  "access_arr"
                ];
              };
            }
          )
          arrs
        );
    };

    setXauthrequest = true;
    trustedProxyIP = ["127.0.0.1"];

    extraConfig = {
      # Enable PKCE
      code-challenge-method = "S256";
      # Share the cookie with all subpages
      whitelist-domain = ".${mediaBaseDomain}";
      upstream = "static://202";

      oidc-issuer-url = "https://${kanidmDomain}/oauth2/openid/${clientId}";
      provider-display-name = "kanidm";
    };
  };

  nixflix = {
    radarr.settings = {
      auth = {
        required = lib.mkForce "Enabled";
        method = lib.mkForce "External";
      };
    };
    sonarr.settings = {
      auth = {
        required = lib.mkForce "Enabled";
        method = lib.mkForce "External";
      };
    };
    sonarr-anime.settings = {
      auth = {
        required = lib.mkForce "Enabled";
        method = lib.mkForce "External";
      };
    };
    prowlarr.settings = {
      auth = {
        required = lib.mkForce "Enabled";
        method = lib.mkForce "External";
      };
    };

    torrentClients.qbittorrent.serverConfig.Preferences.WebUI = {
      LocalHostAuth = lib.mkForce false;
      HostHeaderValidation = lib.mkForce false;
      CSRFProtection = lib.mkForce false;
    };
  };

  sops.secrets = {
    kanidm-oauth2-arr = {
      key = "oauth2/basic/arr";
      sopsFile = "${inputs.self}/secrets/kanidm.yaml";
    };

    kanidm-oauth2-arr-cookie = {
      key = "oauth2-proxy/cookie-secret";
      sopsFile = "${inputs.self}/secrets/arr.yaml";
    };
  };
}
