{
  lib,
  pkgs,
  ...
}: {
  boot.initrd.systemd.enable = lib.mkDefault true;
  system.etc.overlay.enable = lib.mkDefault true;
  services.userborn.enable = lib.mkDefault true;

  # Random perl remnants
  system.tools.nixos-generate-config.enable = lib.mkDefault false;
  boot.loader.grub.enable = lib.mkDefault false;
  environment.defaultPackages = lib.mkDefault [];
  documentation.info.enable = lib.mkDefault false;
  documentation.nixos.enable = lib.mkDefault false;
}
