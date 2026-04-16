{pkgs, ...}: {
  tl.services.klipper-screen = {
    enable = true;
    # package = pkgs.klipperscreen;
    settings = {
      "printer VzBot 235" = {
        moonraker_host = "127.0.0.1";
        moonraker_port = 7125;
        extrude_distances = "5, 10, 25, 50";
        extrude_speeds = "1, 2, 5, 25";
      };

      "main" = {
        print_sort_dir = "date_desc";
      };

      "preheat ABS+" = {
        extruder = 235;
        heater_bed = 95;
        chamber = 40;
      };

      "preheat coPET" = {
        extruder = 245;
        heater_bed = 80;
      };

      "menu __main LEDProfile" = {
        name = "LED";
        icon = "light";
      };

      # TODO: may be custom theme for icons?
      "menu __main LEDProfile Dark" = {
        name = "Dark";
        icon = "avatar-default";
        method = "printer.gcode.script";
        params = ''{"script":"LED_NONE"}'';
      };

      "menu __main LEDProfile Full" = {
        name = "Full";
        icon = "light";
        method = "printer.gcode.script";
        params = ''{"script":"LED_FULL"}'';
      };
    };
  };

  services.xserver = {
    enable = true;
    logFile = "/dev/null";

    displayManager = {
      startx.enable = true;
      xserverArgs = ["-keeptty" "-logverbose" "-verbose"];
    };

    excludePackages = with pkgs; [
      xterm
      xdg-utils
      nixos-icons
      xorg.iceauth
    ];
  };
}
