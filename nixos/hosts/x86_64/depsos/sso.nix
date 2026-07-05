{
  pkgs,
  config,
  inputs,
  ...
}: let
  kanidmDomain = "auth.tlctr.me";
  kanidmPort = 8300;
in {
  services.nginx = {
    enable = true;

    virtualHosts.${kanidmDomain} = {
      enableACME = true;
      forceSSL = true;
      kTLS = true;

      locations."/" = {
        proxyPass = "https://localhost:${toString kanidmPort}/";

        # Until proper checks maybe because why not?
        extraConfig = ''
          proxy_ssl_verify off;
        '';
      };
    };
  };

  services.kanidm = {
    package = pkgs.kanidmWithSecretProvisioning_1_10;

    client = {
      enable = true;
      settings = {
        uri = "https://127.0.0.1:${toString kanidmPort}";
        # ca_path = config.sops.secrets.kanidm-tls-chain.path;
        verify_ca = false;
      };
    };

    server = {
      enable = true;
      settings = {
        domain = kanidmDomain;
        origin = "https://${kanidmDomain}";
        tls_chain = config.sops.secrets.kanidm-tls-chain.path;
        tls_key = config.sops.secrets.kanidm-tls-key.path;
        bindaddress = "0.0.0.0:${toString kanidmPort}";
      };
    };

    provision = {
      enable = true;
      adminPasswordFile = config.sops.secrets.kanidm-admin-password.path;
      idmAdminPasswordFile = config.sops.secrets.kanidm-idm-admin-password.path;

      persons = {
        truelecter = {
          present = true;
          displayName = "truelecter";
          legalName = "Andrii";
          mailAddresses = ["andrew.panassiouk@gmail.com"];
        };
        mariia = {
          present = true;
          displayName = "mariia";
          legalName = "Mariia";
          mailAddresses = ["mariia@tlctr.me"];
        };
      };

      # access only to jellyfin and seerr
      groups."media.access" = {
        members = [
          "mariia"
          "media.admins"
        ];
      };
      # access to whole *arr stack
      groups."media.admins" = {
        members = [
          "truelecter"
        ];
      };

      systems.oauth2.jellyfin = {
        displayName = "Jellyfin";
        originUrl = [
          "https://jellyfin.xata.house/sso/OID/redirect/kanidm"
          "https://jellyfin.xata.house/sso/OID/r/kanidm"
        ];
        originLanding = "https://jellyfin.xata.house/";
        basicSecretFile = config.sops.secrets.kanidm-oauth2-jellyfin.path;
        preferShortUsername = true;
        scopeMaps."media.access" = [
          "openid"
          "email"
          "profile"
          "groups"
        ];
        scopeMaps."media.admins" = [
          "openid"
          "email"
          "profile"
          "groups"
        ];
        allowInsecureClientDisablePkce = true;
      };

      systems.oauth2.seerr = {
        displayName = "Seerr";
        originUrl = [
          "https://seerr.xata.house/login"
          "https://seerr.xata.house/profile/settings/linked-accounts"
        ];
        originLanding = "https://seerr.xata.house/";
        basicSecretFile = config.sops.secrets.kanidm-oauth2-seerr.path;
        preferShortUsername = true;
        scopeMaps."media.access" = [
          "openid"
          "email"
          "profile"
          "groups"
        ];
        scopeMaps."media.admins" = [
          "openid"
          "email"
          "profile"
          "groups"
        ];
        allowInsecureClientDisablePkce = true;
      };

      systems.oauth2.arr = {
        displayName = "ARR";
        originUrl = [
          "https://arr.xata.house/oauth2/callback"
        ];
        originLanding = "https://arr.xata.house/";
        basicSecretFile = config.sops.secrets.kanidm-oauth2-arr.path;
        preferShortUsername = true;

        scopeMaps."media.admins" = [
          "openid"
          "email"
        ];

        claimMaps.groups = {
          joinType = "array";
          valuesByGroup."media.admins" = ["access_arr" "access_radarr"];
        };
      };
    };
  };

  sops.secrets = let
    sopsFile = "${inputs.self}/secrets/kanidm.yaml";

    owner = "kanidm";

    secret = key: {
      inherit sopsFile owner key;
    };
  in {
    kanidm-tls-chain = secret "certificate/chain";
    kanidm-tls-key = secret "certificate/key";
    kanidm-admin-password = secret "password/admin";
    kanidm-idm-admin-password = secret "password/idm-admin";
    # tr --complement --delete 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkpqrstuvwxyz0123456789' < /dev/urandom | head --bytes 48
    kanidm-oauth2-jellyfin = secret "oauth2/basic/jellyfin";
    kanidm-oauth2-seerr = secret "oauth2/basic/seerr";
    kanidm-oauth2-arr = secret "oauth2/basic/arr";
  };
}
