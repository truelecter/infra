{config, ...}: let
  klipperCfg = config.services.klipper;
  boards = config.printer.firmwareConfigs;
in {
  printer.klipperConfigDir = ./configs/klipper.d;

  services.klipper = {
    settings = {
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
    };

    firmwares = {
      ebb36 = {
        enable = true;
        enableKlipperFlash = true;
        inherit (boards.ebb36) configFile katapultConfigFile;
        canbusUuid = klipperCfg.settings."mcu toolhead".canbus_uuid;
      };

      manta-v2 = {
        enable = true;
        enableKlipperFlash = true;
        inherit (boards.manta-v2) configFile katapultConfigFile;
        canbusUuid = klipperCfg.settings."mcu back".canbus_uuid;
      };

      buttons = {
        enable = true;
        inherit (boards.rp2040) configFile katapultConfigFile;
      };

      stealthmax = {
        enable = true;
        enableKlipperFlash = true;
        inherit (boards.ebb36) configFile katapultConfigFile;
        canbusUuid = klipperCfg.settings."mcu SM".canbus_uuid;
      };

      octopus = {
        enable = true;
        enableKlipperFlash = true;
        inherit (boards.octopus-pro) configFile katapultConfigFile;
        inherit (klipperCfg.settings.mcu) serial;
      };
    };
  };
}
