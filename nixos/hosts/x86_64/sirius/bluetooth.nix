{
  config,
  lib,
  utils,
  ...
}: let
  bt = config.hardware.bluetooth;
in {
  hardware.bluetooth = {
    enable = true;
    powerOnBoot = true;
    settings = {
      GATT = {
        Cache = "no";
        Channels = "1";
      };
      General = {
        ControllerMode = "dual";
      };
    };
  };

  boot.kernelModules = ["btusb"];

  services.udev.extraRules = ''
    # SUBSYSTEM=="usb", ATTRS{idVendor}=="8087", ATTRS{idProduct}=="0032", ATTR{authorized}="0"
    SUBSYSTEM=="usb", ATTRS{idVendor}=="0bda", ATTRS{idProduct}=="a729", ATTR{authorized}="0"
  '';
}
