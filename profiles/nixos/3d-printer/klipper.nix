{
  config,
  pkgs,
  lib,
  ...
}: let
  cfg = config.printer;
  klipperCfg = config.services.klipper;
  gcodePath = "${config.services.moonraker.stateDir}/gcodes";

  linkDir = dir:
    builtins.listToAttrs (
      map (
        p: {
          name = "klipper/${lib.path.removePrefix dir p}";
          value = {
            inherit (klipperCfg) user group;

            source = p;
          };
        }
      )
      (lib.filesystem.listFilesRecursive dir)
    );
in {
  # The host's files replace shared ones with the same path.
  environment.etc = linkDir ./klipper.d // linkDir cfg.klipperConfigDir;

  services.klipper = {
    enable = true;

    package = pkgs.kalico-full-plugins;

    settings = {
      "include /etc/klipper/main.cfg" = {};

      shaketune.result_folder = "${klipperCfg.configDir}/klippain-results";

      virtual_sdcard.path = gcodePath;
    };
  };

  systemd = {
    settings.Manager.CPUAffinity = "0-1";
    services.klipper.serviceConfig.CPUAffinity = "2-3";
  };

  environment.systemPackages = [pkgs.katapult-flashtool];

  services.mainsail = {
    enable = true;
    nginx.extraConfig = ''
      client_max_body_size 0;
    '';
  };
}
