{
  pkgs,
  lib,
  ...
}: {
  imports = [
    ./rpi-base.nix
  ];

  boot = {
    # mk slightly higher priority than the default
    kernelPackages = lib.mkOverride 999 pkgs.linuxPackages_rpi4;
  };

  # from nixos-hardware
  hardware.raspberry-pi.firmware.uboot.package = pkgs.ubootRaspberryPi4_64bit;
  hardware.deviceTree.filter = "bcm2711-rpi-4-b.dtb";
}
