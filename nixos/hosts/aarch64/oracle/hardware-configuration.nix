{
  lib,
  modulesPath,
  ...
}: {
  imports = [(modulesPath + "/profiles/qemu-guest.nix")];
  # boot.loader.grub = {
  #   efiSupport = true;
  #   efiInstallAsRemovable = false;
  #   device = "nodev";
  #   configurationLimit = 1;
  # };

  boot.loader = {
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
  boot.kernelParams = [
    "console=ttyS0"
    "console=tty1"
    "nvme.shutdown_timeout=10"
    "libiscsi.debug_libiscsi_eh=1"
  ];

  boot.initrd.availableKernelModules = ["ata_piix" "uhci_hcd" "xen_blkfront" "xhci_pci" "virtio_pci" "usbhid"];
  boot.initrd.kernelModules = ["nvme"];

  boot.kernelModules = [];
  boot.extraModulePackages = [];

  fileSystems."/" = {
    device = "/dev/disk/by-label/cloudimg-rootfs";
    fsType = "ext4";
  };

  fileSystems."/boot" = {
    device = "/dev/disk/by-label/UEFI";
    fsType = "vfat";
  };

  boot.tmp.cleanOnBoot = true;
  zramSwap.enable = true;

  networking = {
    firewall.enable = false;
  };

  networking.useDHCP = lib.mkDefault true;
}
