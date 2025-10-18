{
  pkgs,
  config,
  ...
}: {
  environment.systemPackages = [
    (
      pkgs.v4l-utils.override
      {
        withGUI = false;
      }
    )
  ];

  services.udev.extraRules = ''
    SUBSYSTEM=="dma_heap", GROUP="video", MODE="0660"
  '';

  tl.services.camera-streamer.instances = {
    bbl = {
      enable = true;
      settings = {
        camera = {
          type = "libcamera";
          width = 800;
          height = 600;
          fps = 60;
          format = "YUYV";
          force_active = true;
          nbufs = 2;
          # options = {
          #   whitebalanceautomatic = 0;
          #   whitebalancetemperature = 5700;
          # };
        };
        # webrtc.disable_client_ice = true;
        http.port = 8081;
      };

      nginx.enable = true;
    };
  };
}
