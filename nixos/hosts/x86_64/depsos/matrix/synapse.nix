{
  lib,
  pkgs,
  config,
  ...
}: let
  sCfg = config.tl.matrix;
in {
  environment.systemPackages = with pkgs; [matrix-synapse];

  sops.secrets = let
    sopsFile = ../../../../../secrets/matrix/synapse.yaml;
  in {
    synapse_registration_secret = {
      inherit sopsFile;
      mode = "0440";
      group = config.users.groups.matrix-synapse.name;
    };
  };

  services.nginx = {
    virtualHosts = {
      ${sCfg.homeserver-hostname} = {
        enableACME = true;
        forceSSL = true;

        locations."/".extraConfig = ''
          return 404;
        '';

        locations."/_matrix" = {
          proxyPass = "http://127.0.0.1:8008";
        };

        locations."/_synapse/client" = {
          proxyPass = "http://127.0.0.1:8008";
        };
      };

      ${sCfg.server-name} = {
        locations."/.well-known/matrix/server" = {
          extraConfig = ''
            default_type application/json;
            add_header "Access-Control-Allow-Origin" *;
            return 200 '{ "m.server": "${sCfg.homeserver-hostname}:443" }';
          '';
        };

        locations."/.well-known/matrix/client" = {
          extraConfig = ''
            default_type application/json;
            add_header "Access-Control-Allow-Origin" *;
            return 200 '{ "m.homeserver": { "base_url": "https://${sCfg.homeserver-hostname}" } }';
          '';
        };
      };
    };
  };

  services.matrix-synapse = {
    enable = true;

    extraConfigFiles = [
      config.sops.secrets.synapse_registration_secret.path
    ];

    # The public base URL value must match the `base_url` value set in `clientConfig` above.
    # The default value here is based on `server_name`, so if your `server_name` is different
    # from the value of `fqdn` above, you will likely run into some mismatched domain names
    # in client applications.
    settings = {
      server_name = sCfg.server-name;

      public_baseurl = "https://${sCfg.homeserver-hostname}";
      enable_registration = false;
      database = {
        name = "psycopg2"; # Also sets default username and dbname to "matrix-synapse"
      };
      listeners = [
        {
          port = 8008;
          bind_addresses = ["127.0.0.1"];
          type = "http";
          tls = false;
          x_forwarded = true;
          resources = [
            {
              names = ["client" "federation"];
              compress = true;
            }
          ];
        }
      ];
    };
  };
}
