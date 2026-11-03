{
  lib,
  inputs,
  config,
  catalog,
  ...
}: let
  mediaBaseDomain = catalog.domains.media;
  portal = catalog.services.arr.fqdn;
  kanidmDomain = catalog.domains.sso;
in {
  services.nginx.virtualHosts.${portal} = {
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
    redirectURL = "https://${portal}/oauth2/callback";

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
      domain = portal;
      virtualHosts = lib.listToAttrs (map (arr:
        lib.nameValuePair catalog.services.${arr}.fqdn {
          allowed_groups = ["access_arr"];
        }) ["sonarr" "radarr" "prowlarr" "qbittorrent"]);
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
    radarr.config.hostConfig.authenticationMethod = "external";

    sonarr.config.hostConfig.authenticationMethod = "external";

    prowlarr.config.hostConfig.authenticationMethod = "external";

    # radarr.settings = {
    #   auth = {
    #     required = lib.mkForce "Enabled";
    #     method = lib.mkForce "External";
    #   };
    # };
    # sonarr.settings = {
    #   auth = {
    #     required = lib.mkForce "Enabled";
    #     method = lib.mkForce "External";
    #   };
    # };
    # prowlarr.settings = {
    #   auth = {
    #     required = lib.mkForce "Enabled";
    #     method = lib.mkForce "External";
    #   };
    # };

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
