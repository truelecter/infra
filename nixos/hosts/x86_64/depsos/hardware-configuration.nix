{
  config,
  lib,
  pkgs,
  modulesPath,
  ...
}: {
  imports = [];

  boot.loader = {
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
  }; # bootloader

  boot.initrd.availableKernelModules = ["ata_piix" "mptspi" "ahci" "sd_mod" "sr_mod"];
  boot.initrd.kernelModules = [];
  boot.kernelModules = [];
  boot.extraModulePackages = [];

  fileSystems."/" = {
    device = "/dev/disk/by-label/system";
    fsType = "ext4";
  };

  fileSystems."/boot" = {
    device = "/dev/disk/by-label/boot";
    fsType = "vfat";
  };

  fileSystems."/srv" = {
    device = "/dev/disk/by-label/srv-data";
    fsType = "ext4";
  };

  virtualisation.containers.storage.settings.storage.graphroot = "/srv/containsers/storage";

  swapDevices = [
    {
      device = "/dev/disk/by-label/swap";
    }
  ];

  hardware.cpu.intel.updateMicrocode = lib.mkDefault config.hardware.enableRedistributableFirmware;
  virtualisation.vmware.guest.enable = true;
  virtualisation.vmware.guest.headless = true;

  networking = {
    useDHCP = false;
    firewall.enable = false;
    nameservers = ["1.1.1.1" "8.8.8.8"];
    interfaces.eth0 = {
      ipv4 = {
        addresses = [
          {
            address = "192.168.20.37";
            prefixLength = 24;
          }
        ];
        routes = [
          {
            address = "0.0.0.0";
            prefixLength = 0;
            via = "192.168.20.62";
          }
        ];
      };
    };
  };
}
