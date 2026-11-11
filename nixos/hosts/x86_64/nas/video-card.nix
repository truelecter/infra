# UHD 730 (i3-12100 iGPU): QuickSync for Jellyfin and Immich transcoding,
# OpenCL for Immich ML through OpenVINO.
{pkgs, ...}: {
  hardware.graphics = {
    enable = true;
    extraPackages = with pkgs; [
      intel-media-driver # VA-API
      vpl-gpu-rt # oneVPL runtime for QuickSync on Gen12+
      intel-compute-runtime # OpenCL, used by OpenVINO
    ];
  };

  environment.sessionVariables.LIBVA_DRIVER_NAME = "iHD";
}
