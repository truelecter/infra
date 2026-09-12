{pkgs, ...}: {
  imports = [
    ./rpi-base.nix
  ];

  boot.kernelPackages = pkgs.linuxPackages_rpi02;

  hardware.raspberry-pi.firmware.uboot.package = pkgs.ubootRaspberryPi3_64bit;
}
