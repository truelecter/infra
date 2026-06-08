{pkgs, ...}: {
  tl.services.klipper-screen = {
    enable = true;
    # package = pkgs.klipperscreen;
    settings = {
      "printer VzBot 235" = {
        moonraker_host = "10.3.0.131";
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

  hardware = {
    # firmware = [
    #   ((
    #       pkgs.runCommandNoCC
    #       "mali_csffw.bin"
    #       {}
    #       "mkdir -p $out/lib/firmware && cp ${./mali_csffw.bin} $out/lib/firmware/mali_csffw.bin"
    #     )
    #     // {
    #       compressFirmware = false; # TODO can I re-enable compression?
    #     })
    # ];

    # opengl.extraPackages = with pkgs; [
    #   # TODO are these needed?
    #   vaapiVdpau
    #   libvdpau-va-gl
    # ];
    graphics = {
      # driSupport = true;
      # setLdLibraryPath = true;
      enable = true;
      # package =
      #   (
      #     (pkgs.mesa.override {
      #       galliumDrivers = ["llvmpipe" "panfrost"];
      #       vulkanDrivers = ["swrast" "panfrost"];
      #     })
      #     .overrideAttrs
      #     (o: {
      #       mesonFlags =
      #         o.mesonFlags
      #         ++ [
      #           (lib.mesonEnable "gallium-vdpau" false)
      #           (lib.mesonEnable "gallium-va" false)
      #           (lib.mesonEnable "gallium-xa" false)
      #         ];
      #     })
      #   )
      #   .drivers;
      # package =
      #   lib.mkForce
      #   (pkgs.mesa.override {
      #     galliumDrivers = ["panfrost" "softpipe" "llvmpipe" "r600"];
      #     vulkanDrivers = ["panfrost" "swrast"];
      #   })
      #   .drivers;
    };
  };

  services.udev.extraRules = ''
    KERNEL=="mpp_service", MODE="0660", GROUP="video"
    KERNEL=="rga", MODE="0660", GROUP="video"
    KERNEL=="system-dma32", MODE="0666", GROUP="video"
    KERNEL=="system-uncached-dma32", MODE="0666", GROUP="video" RUN+="${pkgs.busybox}/bin/chmod a+rw /dev/dma_heap"
    KERNEL=="system-uncached", MODE="0666", GROUP="video"
  '';
}
