{config, ...}: let
  klipperCfg = config.services.klipper;
  boards = config.printer.firmwareConfigs;
in {
  printer.klipperConfigDir = ./configs/klipper.d;

  services.klipper = {
    settings = {
      mcu.canbus_uuid = "4efea7048de3";
      "mcu toolhead".canbus_uuid = "eb213ad58522";
      "mcu cartographer".canbus_uuid = "1b2077216a55";
    };

    firmwares = {
      ebb36 = {
        enable = true;
        enableKlipperFlash = true;
        inherit (boards.ebb36) configFile katapultConfigFile;
        canbusUuid = klipperCfg.settings."mcu toolhead".canbus_uuid;
      };

      m5p = {
        enable = true;
        enableKlipperFlash = true;
        inherit (boards.m5p) configFile katapultConfigFile;
        canbusUuid = klipperCfg.settings.mcu.canbus_uuid;
      };
    };
  };
}
