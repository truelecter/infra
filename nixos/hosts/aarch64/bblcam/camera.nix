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

  # services.mediamtx = {
  #   enable = true;
  #   allowVideoAccess = true;
  #   settings = {
  #     rtsp = true;
  #     rtspAddress = ":8554";
  #     rtmp = false;
  #     hls = false;
  #     webrtc = true;
  #     webrtcAddress = ":8555";
  #     srt = false;
  #     paths = {
  #       cam = {
  #         sourceOnDemand = false;
  #         source = "rpiCamera";
  #         rpiCameraWidth = 1920;
  #         rpiCameraHeight = 1080;
  #         rpiCameraFPS = 30;
  #         rpiCameraDenoise = "cdn_fast";
  #         rpiCameraROI = "0,0.15,0.85,0.75";
  #         rpiCameraAfSpeed = "fast";
  #         rpiCameraAfRange = "macro";
  #         rpiCameraAWB = "indoor";
  #         # rpiCameraMode = "2304:1296";
  #       };
  #     };
  #   };
  # };

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
