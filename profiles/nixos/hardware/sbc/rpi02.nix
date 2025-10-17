{pkgs, ...}: {
  imports = [
    ./rpi-base.nix
  ];

  boot.kernelPackages = pkgs.linuxPackages_rpi02;
}
