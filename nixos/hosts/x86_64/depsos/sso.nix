{
  pkgs,
  config,
  inputs,
  catalog,
  ...
}: let
  kanidmDomain = catalog.services.kanidm.fqdn;
  # Base URL of a catalog service.
  url = service: "https://${catalog.services.${service}.fqdn}";
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
    package = pkgs.kanidmWithSecretProvisioning_1_11;

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
          "${url "jellyfin"}/sso/OID/redirect/kanidm"
          "${url "jellyfin"}/sso/OID/r/kanidm"
        ];
        originLanding = "${url "jellyfin"}/";
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
          "${url "seerr"}/login"
          "${url "seerr"}/profile/settings/linked-accounts"
        ];
        originLanding = "${url "seerr"}/";
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
          "${url "arr"}/oauth2/callback"
        ];
        originLanding = "${url "arr"}/";
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

      systems.oauth2.immich = {
        displayName = "Immich";
        originUrl = [
          "${url "immich"}/auth/login"
          "${url "immich"}/user-settings"
          "${url "immich"}/api/oauth/mobile-redirect"
        ];
        originLanding = "${url "immich"}/";
        basicSecretFile = config.sops.secrets.kanidm-oauth2-immich.path;
        preferShortUsername = true;
        scopeMaps."media.access" = [
          "openid"
          "email"
          "profile"
        ];

        claimMaps.immich_role = {
          joinType = "ssv";
          valuesByGroup."media.admins" = ["admin"];
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
    kanidm-oauth2-immich = secret "oauth2/basic/immich";
  };
}
