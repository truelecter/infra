{config, ...}: let
  klipperCfg = config.services.klipper;
in {
  printer.klipperConfigDir = ./configs/klipper.d;

  services.klipper = {
    extraConfigurationPackages = [
      # pkgs.kamp
    ];

    settings = {
      mcu.canbus_uuid = "4efea7048de3";
      "mcu toolhead".canbus_uuid = "eb213ad58522";
      "mcu cartographer".canbus_uuid = "1b2077216a55";
    };

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
}
