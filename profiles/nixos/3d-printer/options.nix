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
      description = ''
        Directory whose files are linked into `/etc/klipper`, on top of the shared `klipper.d` of this profile; a file with the same path replaces the shared one.
        It must contain `printer.cfg`, included by the shared `main.cfg`.
      '';
    };

    firmwareConfigs = mkOption {
      type = types.attrsOf (types.attrsOf types.path);
      readOnly = true;
      default = lib.mapAttrs (board: _: {
        configFile = ./firmwares/${board}/klipper;
        katapultConfigFile = ./firmwares/${board}/katapult;
      }) (lib.filterAttrs (_: type: type == "directory") (builtins.readDir ./firmwares));
      description = "Klipper and Katapult configs per board, from `firmwares/<board>/{klipper,katapult}` of this profile.";
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
        default = {
          Dark = {
            icon = "avatar-default";
            script = "LED_NONE";
          };
          Full.script = "LED_FULL";
        };
        description = "Entries of the KlipperScreen LED menu; empty means no menu. The defaults call the `LED_NONE` and `LED_FULL` macros every printer defines.";
      };
    };

    wifi = {
      enable = mkEnableOption "wifi through wpa_supplicant";
      cm4ExternalAntenna = mkEnableOption "the CM4 external antenna overlay and Raspberry Pi wireless firmware";
    };
  };
}
