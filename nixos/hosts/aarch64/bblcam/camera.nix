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
    pkgs.camera-streamer
  ];

  users.groups.dma-heap = {};

  services.udev.extraRules = ''
    SUBSYSTEM=="dma_heap", GROUP="dma-heap", MODE="0660"
  '';

  tl.services.camera-streamer.instances = {
    bbl = {
      enable = true;
      settings = {
        camera = {
          type = "libcamera";
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
        # webrtc.disable_client_ice = true;
        http.port = 8081;
      };

      nginx.enable = true;
    };
  };
}
