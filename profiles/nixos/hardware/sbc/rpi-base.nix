{
  lib,
  pkgs,
  ...
}: {
  boot = {
    loader = {
      grub.enable = false;
      generic-extlinux-compatible = {
        enable = true;
        configurationLimit = lib.mkDefault 5;
      };
    };

    consoleLogLevel = 7;

    initrd.availableKernelModules = [
      "xhci_hcd"
      "xhci_pci"

      "usbhid"
      "usb_storage"

      "sdhci_pci"
      "mmc_block"

      "vc4"
      "pcie_brcmstb" # required for the pcie bus to work
      "reset-raspberrypi" # required for vl805 firmware to load
    ];
  };

  boot.kernelParams = ["console=serial0,115200n8" "console=tty1"];

  hardware.enableRedistributableFirmware = true;

  # ensure these groups used by udev rules exist
  # as of raspberrypi-udev-rules-20250423
  users.extraGroups = {
    gpio = {};
    i2c = {};
    input = {};
    plugdev = {};
    spi = {};
    video = {};
  };

  services.udev.packages = [
    pkgs.raspberrypi-udev-rules
  ];

  systemd.tmpfiles.packages = [
    pkgs.raspberrypi-udev-rules
  ];
}
