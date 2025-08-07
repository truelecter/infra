{
  config,
  lib,
  ...
}: {
  environment = let
    kernelModules = ["vhci-hcd"];
  in {
    # Only set the options if the files are managed by WSL
    etc = {
      "modules-load.d/nixos.conf".text = lib.concatStringsSep "\n" kernelModules;
    };
  };

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

  hardware.enableRedistributableFirmware = true;
  hardware.firmwareCompression = "none";

  system.activationScripts.udevd = ''
    # The deprecated hotplug uevent helper is not used anymore
    if [ -e /proc/sys/kernel/hotplug ]; then
      echo "" > /proc/sys/kernel/hotplug
    fi

    # Allow the kernel to find our firmware.
    if [ -e /sys/module/firmware_class/parameters/path ]; then
      echo -n "${config.hardware.firmware}/lib/firmware" > /sys/module/firmware_class/parameters/path
    fi
  '';
}
