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
      pkgs.kamp
    ];

    settings = {
      "include /etc/klipper/main.cfg" = {};

      mcu = {
        serial = "/dev/serial/by-id/usb-Klipper_stm32h723xx_20003A000951313339373836-if00";
        # canbus_uuid = "42545159bd5a";
      };
      "mcu back".canbus_uuid = "a04615c85abf";
      # "mcu toolhead".canbus_uuid = "13ddde1f7caf";
      "mcu toolhead".canbus_uuid = "735b8005ab2b";
      "mcu SM".canbus_uuid = "87b7ace7855f";
      "mcu cartographer".canbus_uuid = "d5d27f831859";
      # "mcu hotkey" = {
      #   serial = "/dev/serial/by-id/usb-Klipper_rp2040_E6625C4893826B33-if00";
      #   is_non_critical = true;
      # };

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

      manta-v2 = {
        enable = true;
        enableKlipperFlash = true;
        configFile = ./firmwares/klipper-manta-v2;
        katapultConfigFile = ./firmwares/katapult-manta-v2;
        canbusUuid = klipperCfg.settings."mcu back".canbus_uuid;
      };

      buttons = {
        enable = true;
        configFile = ./firmwares/klipper-buttons;
        katapultConfigFile = ./firmwares/katapult-buttons;
      };

      stealthmax = {
        enable = true;
        enableKlipperFlash = true;
        configFile = ./firmwares/klipper-stealthmax;
        katapultConfigFile = ./firmwares/katapult-stealthmax;
        canbusUuid = klipperCfg.settings."mcu SM".canbus_uuid;
      };

      octopus = {
        enable = true;
        enableKlipperFlash = true;
        configFile = ./firmwares/klipper-octopus-pro;
        katapultConfigFile = ./firmwares/katapult-octopus-pro;
        inherit (klipperCfg.settings.mcu) serial;
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
