{
  config,
  pkgs,
  suites,
  ...
}: {
  imports =
    suites.base
    ++ [
      ./hardware-configuration.nix
      ./modules.nix
      ./zfs-mounts.nix
      ./media-server.nix
    ];

  boot.loader = {
    systemd-boot.enable = false;
    efi = {
      canTouchEfiVariables = true;
      efiSysMountPoint = "/boot";
    }; # efi
    grub = {
      devices = ["nodev"];
      enable = true;
      efiSupport = true;
      version = 2;
      useOSProber = true;
    }; # grub
  }; # bootloader

  networking = {
    hostName = "nas";
    networkmanager.enable = true;
    hostId = "00000000";
  };

  virtualisation.docker.enable = true;

  networking.firewall.enable = false;

  system.stateVersion = "22.05";
}
