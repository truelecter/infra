{
  services.camera-streamer.instances = {
    printer = {
      enable = true;
      settings = {
        camera = {
          type = "v4l2";
          path = "/dev/v4l/by-id/usb-Sonix_Technology_Co.__Ltd._USB_2.0_Camera_SN0001-video-index0";
          width = 1280;
          height = 720;
          fps = 30;
          format = "MJPG";
          force_active = true;
          nbufs = 2;
          options = {
            exposure_dynamic_framerate = 0;
            auto_exposure = 3;
            backlight_compensation = 1;
            brightness = -5;
            contrast = 15;
            gamma = 100;
            sharpness = 6;
            saturation = 60;
          };
        };
        # webrtc.disable_client_ice = true;
        http.port = 8081;
      };

      nginx.enable = true;
    };
  };

  boot.kernelParams = [
    "cma=256M"
  ];
}
