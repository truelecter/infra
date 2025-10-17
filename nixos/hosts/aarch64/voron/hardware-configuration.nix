{
  lib,
  pkgs,
  modulesPath,
  ...
}: {
  # Breaks bluetooth
  # imports = [
  #   "${modulesPath}/installer/sd-card/sd-image-aarch64-installer.nix"
  # ];
  # sdImage.compressImage = false;

  boot = {
    kernelParams = [
      "console=ttyS0,115200"
      "console=tty1"
      "video=DSI-0:800x480@60"
    ];
  };

  fileSystems = {
    "/boot/firmware" = {
      device = "/dev/disk/by-label/FIRMWARE";
      fsType = "vfat";
      options = ["nofail"];
    };
    "/" = {
      device = lib.mkForce "/dev/disk/by-label/NIXOS_SD";
      fsType = "ext4";
    };
  };

  powerManagement.cpuFreqGovernor = "performance";

  hardware.deviceTree.filter = "bcm2711-rpi-4-b.dtb";

  environment.etc."uboot/u-boot.bin".source = "${pkgs.ubootRaspberryPi4_64bit}/u-boot.bin";
}
