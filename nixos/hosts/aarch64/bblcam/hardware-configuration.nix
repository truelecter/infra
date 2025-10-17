{
  lib,
  pkgs,
  modulesPath,
  config,
  ...
}: {
  imports = [
    "${modulesPath}/installer/sd-card/sd-image-aarch64.nix"
  ];

  sdImage = {
    # bzip2 compression takes loads of time with emulation, skip it. Enable this if you're low on space.
    compressImage = false;
    imageName = "bblcam.img";
  };

  zramSwap = {
    enable = false;
    algorithm = "zstd";
  };

  fileSystems = {
    "/boot/firmware" = {
      device = "/dev/disk/by-label/FIRMWARE";
      fsType = "vfat";
      options = [
        "noatime"
        "noauto"
        "x-systemd.automount"
        "x-systemd.idle-timeout=1min"
      ];
    };
    "/" = {
      device = "/dev/disk/by-label/NIXOS_SD";
      fsType = "ext4";
      options = ["noatime"];
    };
  };

  boot.kernelParams = ["8250.nr_uarts=1"];

  powerManagement.cpuFreqGovernor = "performance";

  hardware.deviceTree = {
    filter = "bcm2710-rpi-zero-2-w.dtb";

    overlays = let
      overlay = name: {
        inherit name;
        dtboFile = "${config.boot.kernelPackages.kernel.outPath}/dtbs/overlays/${name}.dtbo";
      };
    in [
      (overlay "dwc2")
      (overlay "disable-bt")
    ];
  };

  hardware.firmware = [pkgs.origRpiWirelessFirmware];

  environment.etc."uboot/u-boot.bin".source = "${pkgs.ubootRaspberryPi3_64bit}/u-boot.bin";
}
