{modulesPath, ...}: {
  imports = [(modulesPath + "/profiles/qemu-guest.nix")];
  # boot.loader.grub = {
  #   efiSupport = true;
  #   efiInstallAsRemovable = false;
  #   device = "nodev";
  #   configurationLimit = 1;
  # };

  boot = {
    loader = {
      efi = {
        canTouchEfiVariables = true;
        efiSysMountPoint = "/boot";
      };

      systemd-boot = {
        enable = true;
        configurationLimit = 2;
      };
    };

    # Kernel cmdline from Ubuntu config
    kernelParams = [
      "console=ttyS0"
      "console=tty1"
      "nvme.shutdown_timeout=10"
      "libiscsi.debug_libiscsi_eh=1"
    ];

    initrd = {
      availableKernelModules = ["ata_piix" "uhci_hcd" "xen_blkfront" "xhci_pci" "virtio_pci" "usbhid"];
      kernelModules = ["nvme"];
    };

    kernelModules = [];
    extraModulePackages = [];

    tmp.cleanOnBoot = true;
  };

  fileSystems = {
    "/" = {
      device = "/dev/disk/by-label/cloudimg-rootfs";
      fsType = "ext4";
    };

    "/boot" = {
      device = "/dev/disk/by-label/UEFI";
      fsType = "vfat";
    };
  };

  zramSwap.enable = true;

  networking = {
    firewall.enable = false;
    useDHCP = true;
  };
}
