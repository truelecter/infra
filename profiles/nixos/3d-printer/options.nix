{lib, ...}: let
  inherit (lib) mkOption mkEnableOption types;
in {
  options.printer = {
    name = mkOption {
      type = types.str;
      example = "Voron 2.4";
      description = "Printer name shown in KlipperScreen.";
    };

    klipperConfigDir = mkOption {
      type = types.path;
      example = lib.literalExpression "./configs/klipper.d";
      description = "Directory whose files are linked into `/etc/klipper`.";
    };

    canbus.txQueueLength = mkOption {
      type = types.ints.positive;
      default = 128;
      description = "TransmitQueueLength of can0.";
    };

    klipperScreen = {
      enable = mkEnableOption "KlipperScreen";

      ledProfiles = mkOption {
        type = types.attrsOf (types.submodule {
          options = {
            icon = mkOption {
              type = types.str;
              default = "light";
            };
            script = mkOption {
              type = types.str;
              example = "LED_FULL";
              description = "G-code run when the entry is pressed.";
            };
          };
        });
        default = {};
        description = "Entries of the KlipperScreen LED menu; empty means no menu.";
      };
    };

    wifi = {
      enable = mkEnableOption "wifi through wpa_supplicant";
      cm4ExternalAntenna = mkEnableOption "the CM4 external antenna overlay and Raspberry Pi wireless firmware";
    };
  };
}
