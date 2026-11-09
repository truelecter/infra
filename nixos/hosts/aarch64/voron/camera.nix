{
  services.camera-streamer.instances = {
    nozzle = {
      enable = false;
      settings = {
        camera = {
          path = "/dev/v4l/by-id/usb-3DO_3DO_NOZZLE_CAMERA_V2_3DO-video-index0";
          type = "v4l2";
          width = 1280;
          height = 720;
          fps = 60;
          format = "MJPG";
          nbufs = 2;
          force_active = true;
          options = {
            autoexposure = 3;
            backlightcompensation = 1;
            brightness = -10;
            contrast = 1;
            gamma = 100;
            sharpness = 5;
          };
        };

        http = {
          port = 8080;
          listen = "0.0.0.0";
        };

        rtsp = {
          port = 8554;
        };
      };

      nginx.enable = true;
    };

    printer = {
      enable = true;
      # package = pkgs.camera-streamer-028;
      settings = {
        camera = {
          type = "v4l2";
          path = "/dev/v4l/by-id/usb-3DO_3DO_USB_CAMERA_V2_3DO-video-index0";
          width = 1280;
          height = 720;
          fps = 30;
          format = "MJPG";
          force_active = true;
          nbufs = 2;
          # options = {
          #   whitebalanceautomatic = 0;
          #   whitebalancetemperature = 5700;
          # };
        };
        # log.verbose = true;
        # log.debug = true;
        # webrtc.disable_client_ice = true;
        # http.listen = "0.0.0.0";
        http.port = 8081;
      };

      nginx.enable = true;
    };
  };

  hardware.raspberry-pi.configtxt.deviceTreeOverlays.pi4 = [
    {dwc2.dr_mode = "host";}
  ];
}
