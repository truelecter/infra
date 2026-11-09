{
  config,
  pkgs,
  lib,
  ...
}: let
  cfg = config.printer;
  klipperCfg = config.services.klipper;
  gcodePath = "${config.services.moonraker.stateDir}/gcodes";
in {
  environment.etc = builtins.listToAttrs (
    map (
      p: {
        name = "klipper/${lib.path.removePrefix cfg.klipperConfigDir p}";
        value = {
          inherit (klipperCfg) user group;

          source = p;
        };
      }
    )
    (lib.filesystem.listFilesRecursive cfg.klipperConfigDir)
  );

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
