{
  pkgs,
  config,
  ...
}: {
  # imports = [
  #   "${modulesPath}/installer/sd-card/sd-image-aarch64.nix"
  # ];

  # sdImage = {
  #   # bzip2 compression takes loads of time with emulation, skip it. Enable this if you're low on space.
  #   compressImage = false;
  #   imageName = "bblcam.img";
  # };

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

  boot.kernelParams = ["8250.nr_uarts=1" "console=ttyS0,115200n8"];

  powerManagement.cpuFreqGovernor = "performance";

  hardware.deviceTree = let
    dtbName = "bcm2710-rpi-zero-2-w.dtb";
  in {
    filter = dtbName;

    overlays = let
      overlay = name: {
        inherit name;
        dtboFile = "${config.boot.kernelPackages.kernel.outPath}/dtbs/overlays/${name}.dtbo";
      };
    in [
      (overlay "dwc2")
      (overlay "disable-bt")
      (overlay "imx708")
      {
        name = "i2c-arm-overlay";
        dtsText = ''
          /dts-v1/;
          /plugin/;
          / {
            compatible = "brcm,bcm2711";
            fragment@0 {
              target = <&i2c1>;
              __overlay__ {
                status = "okay";
              };
            };
          };
        '';
      }
    ];
  };

  environment.etc."uboot/u-boot.bin".source = "${pkgs.ubootRaspberryPi3_64bit}/u-boot.bin";
}
