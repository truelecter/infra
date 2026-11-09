{
  config,
  pkgs,
  ...
}: let
  gcodePath = "${config.services.moonraker.stateDir}/gcodes";
in {
  # Host (Linux) MCU GPIO access.
  boot.kernelModules = ["gpiod"];
  # Disable mic on cameras for some USB bandwidth.
  boot.blacklistedKernelModules = ["snd-usb-audio"];

  environment.systemPackages = [
    (pkgs.v4l-utils.override {withGUI = false;})
    pkgs.camera-streamer
  ];

  users.groups.dma-heap = {};
  services.udev.extraRules = ''
    SUBSYSTEM=="dma_heap", GROUP="dma-heap", MODE="0660"
  '';

  systemd.tmpfiles.rules = [
    "d ${gcodePath} 775 klipper klipper"
  ];
}
