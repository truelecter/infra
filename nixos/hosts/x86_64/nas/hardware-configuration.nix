{
  config,
  lib,
  modulesPath,
  pkgs,
  ...
}: {
  imports = [
    (modulesPath + "/installer/scan/not-detected.nix")
  ];

  boot = {
    initrd = {
      availableKernelModules = ["xhci_pci" "ahci" "nvme" "usbhid" "usb_storage" "sd_mod"];
      kernelModules = [];
    };

    loader = {
      systemd-boot = {
        enable = false;
        consoleMode = "auto";
        editor = false;
        configurationLimit = 1;
      };
      efi = {
        canTouchEfiVariables = true;
        efiSysMountPoint = "/boot";
      }; # efi
      grub = {
        devices = ["nodev"];
        enable = true;
        efiSupport = true;
        useOSProber = false;
      }; # grub
    };

    kernelModules = ["kvm-intel"];
    extraModulePackages = [];
  };

  fileSystems."/" = {
    device = "/dev/disk/by-label/system";
    fsType = "ext4";
  };

  fileSystems."/boot" = {
    device = "/dev/disk/by-label/boot";
    fsType = "vfat";
  };

  swapDevices = [];

  networking.useDHCP = lib.mkDefault true;
  powerManagement.cpuFreqGovernor = "performance";
  hardware.cpu.intel.updateMicrocode = lib.mkDefault config.hardware.enableRedistributableFirmware;

  # Weird bug with NM-wait-online restart on new configuration always fails
  systemd.services.NetworkManager-wait-online.enable = false;
}
