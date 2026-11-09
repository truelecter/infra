{
  config,
  pkgs,
  lib,
  ...
}: let
  klipperCfg = config.services.klipper;
  moonrakerCfg = config.services.moonraker;
  gcodePath = "${moonrakerCfg.stateDir}/gcodes";
in {
  boot.kernelModules = ["gpiod"];

  environment.etc = builtins.listToAttrs (
    map (
      p: {
        name = "klipper/${lib.path.removePrefix ./configs/klipper.d p}";
        value = {
          inherit (klipperCfg) user group;

          source = p;
        };
      }
    )
    (lib.filesystem.listFilesRecursive ./configs/klipper.d)
  );

  services.klipper = {
    enable = true;

    package = pkgs.kalico-full-plugins;

    extraConfigurationPackages = [
      # pkgs.kamp
    ];

    settings = {
      "include /etc/klipper/main.cfg" = {};

      mcu.canbus_uuid = "4efea7048de3";
      "mcu toolhead".canbus_uuid = "eb213ad58522";
      "mcu cartographer".canbus_uuid = "1b2077216a55";

      "shaketune" = {
        result_folder = "${klipperCfg.configDir}/klippain-results";
      };

      virtual_sdcard = {
        path = gcodePath;
      };
    };

    host-mcu.enable = false;

    firmwares = {
      ebb36 = {
        enable = true;
        enableKlipperFlash = true;
        configFile = ./firmwares/klipper-ebb36;
        katapultConfigFile = ./firmwares/katapult-ebb36;
        canbusUuid = klipperCfg.settings."mcu toolhead".canbus_uuid;
      };

      m5p = {
        enable = true;
        enableKlipperFlash = true;
        configFile = ./firmwares/klipper-m5p;
        katapultConfigFile = ./firmwares/katapult-m5p;
        canbusUuid = klipperCfg.settings.mcu.canbus_uuid;
      };
    };
  };

  systemd = {
    settings.Manager = {
      CPUAffinity = "0-1";
    };

    services.klipper.serviceConfig.CPUAffinity = "2-3";
    tmpfiles.rules = [
      "d ${gcodePath} 775 klipper klipper"
    ];
  };

  environment.systemPackages = [pkgs.katapult-flashtool];

  services.mainsail = {
    enable = true;
    nginx.extraConfig = ''
      client_max_body_size 0;
    '';
  };
}
