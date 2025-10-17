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
}
