{
  config,
  pkgs,
  ...
}: let
  klipperCfg = config.services.klipper;
in {
  printer.klipperConfigDir = ./configs/klipper.d;

  services.klipper = {
    extraConfigurationPackages = [
      pkgs.kamp
    ];

    settings = {
      mcu = {
        # canbus_uuid = "66ac0bbb51d2";
        serial = "/dev/serial/by-id/usb-Klipper_stm32h723xx_07002E000F51323137343334-if00";
      };
      "mcu toolhead".canbus_uuid = "13ddde1f7caf";
      "mcu cartographer".canbus_uuid = "4c28e68efedd";
    };

    firmwares = {
      ebb36 = {
        enable = true;
        enableKlipperFlash = true;
        configFile = ./firmwares/klipper-ebb36;
        katapultConfigFile = ./firmwares/katapult-ebb36;
        canbusUuid = klipperCfg.settings."mcu toolhead".canbus_uuid;
      };

      fly-super8-pro = {
        enable = true;
        enableKlipperFlash = true;
        configFile = ./firmwares/klipper-fly-super8;
        katapultConfigFile = ./firmwares/katapult-fly-super8;
        inherit (klipperCfg.settings.mcu) serial;
      };
    };
  };
}
