{
  lib,
  config,
  ...
}: let
  # FIXME: change to static version number when release is made
  # Or even better - package it as a nix package
  # https://github.com/crysxd/OctoApp-Plugin/pkgs/container/octoapp-plugin/versions
  octoapp-plugin-version = "latest";

  mkOptoappInstance = name: config: let
    dataDir = "/srv/octoapp-plugin/${name}";
  in {
    virtualisation.oci-containers = {
      containers."octoapp-${name}" = {
        volumes = ["${dataDir}:/data"];
        environmentFiles = config.environmentFiles or [];
        environment =
          config.environment
          // {
            TZ = "Europe/Kyiv";
          };
        image = "ghcr.io/crysxd/octoapp-plugin:${octoapp-plugin-version}";
        extraOptions = ["--network=host"];
      };
    };

    systemd.tmpfiles.rules = [
      "d '${dataDir}' 0775 root root - -"
    ];
  };
in
  lib.mkMerge [
    # {
    #   sops.secrets.bbl-p1s-envs = {
    #     sopsFile = ../../../../../secrets/printer-secrets.env;
    #     key = "";
    #     format = "dotenv";
    #   };
    # }

    # (mkOptoappInstance "bbl-p1s" {
    #   environment = {
    #     PRINTER_IP = "10.3.0.162";
    #     COMPANION_MODE = "bambu";
    #   };
    #   environmentFiles = [config.sops.secrets.bbl-p1s-envs.path];
    # })

    (mkOptoappInstance "voron" {
      environment = {
        PRINTER_IP = "10.3.0.150";
        COMPANION_MODE = "klipper";
      };
    })

    (mkOptoappInstance "tiny-m" {
      environment = {
        PRINTER_IP = "10.3.0.151";
        COMPANION_MODE = "klipper";
      };
    })

    (mkOptoappInstance "vzbot" {
      environment = {
        PRINTER_IP = "10.3.0.153";
        COMPANION_MODE = "klipper";
      };
    })
  ]
