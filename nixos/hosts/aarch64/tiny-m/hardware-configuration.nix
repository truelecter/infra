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
      "video=DSI-1:800x480@60"
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

  hardware = {
    raspberry-pi."4" = {
      xhci.enable = true;

      i2c0 = {
        enable = true;
        frequency = 50000;
      };

      # i2c1 = {
      #   enable = true;
      #   frequency = 50000;
      # };
    };

    deviceTree = {
      filter = "bcm2711-rpi-cm4.dtb";

      overlays = let
        overlay = name: {
          inherit name;
          dtboFile = "${pkgs.device-tree_rpi.overlays}/${name}.dtbo";
        };
      in [
        (overlay "vc4-fkms-v3d")
        (overlay "rpi-ft5406")
      ];
    };
  };

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

  powerManagement.cpuFreqGovernor = "performance";
}
