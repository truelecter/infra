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
        print_sort_dir = "name_desc";
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
    };
  };
}
