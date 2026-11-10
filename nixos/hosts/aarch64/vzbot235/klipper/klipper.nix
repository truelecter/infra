{config, ...}: let
  klipperCfg = config.services.klipper;
  boards = config.printer.firmwareConfigs;
in {
  printer.klipperConfigDir = ./configs/klipper.d;

  services.klipper = {
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
        inherit (boards.ebb36) configFile katapultConfigFile;
        canbusUuid = klipperCfg.settings."mcu toolhead".canbus_uuid;
      };

      fly-super8-pro = {
        enable = true;
        enableKlipperFlash = true;
        inherit (boards.fly-super8) configFile katapultConfigFile;
        inherit (klipperCfg.settings.mcu) serial;
      };
    };
  };
}
