{
  config,
  lib,
  ...
}: let
  cfg = config.printer;
  inherit (cfg.klipperScreen) ledProfiles;
in {
  services.klipper-screen = lib.mkIf cfg.klipperScreen.enable {
    enable = true;
    settings =
      {
        "printer ${cfg.name}" = {
          moonraker_host = "127.0.0.1";
          moonraker_port = 7125;
          extrude_distances = "5, 10, 25, 50";
          extrude_speeds = "1, 2, 5, 25";
        };

        main.print_sort_dir = "date_desc";

        "preheat ABS+" = {
          extruder = 235;
          heater_bed = 95;
          chamber = 40;
        };

        "preheat coPET" = {
          extruder = 245;
          heater_bed = 80;
        };
      }
      // lib.optionalAttrs (ledProfiles != {}) (
        {
          "menu __main LEDProfile" = {
            name = "LED";
            icon = "light";
          };
        }
        // lib.mapAttrs' (name: p:
          lib.nameValuePair "menu __main LEDProfile ${name}" {
            inherit name;
            inherit (p) icon;
            method = "printer.gcode.script";
            params = builtins.toJSON {inherit (p) script;};
          })
        ledProfiles
      );
  };
}
