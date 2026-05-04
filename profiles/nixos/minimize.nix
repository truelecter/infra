# https://discourse.nixos.org/t/how-to-have-a-minimal-nixos/22652/4
# https://github.com/wucke13/minimal-nixos/blob/main/nixos-modules/embedded/nixos-debloat.nix
{
  modulesPath,
  pkgs,
  lib,
  ...
}: {
  disabledModules = [
    "${modulesPath}/profiles/all-hardware.nix"
    "${modulesPath}/profiles/base.nix"
  ];

  environment.systemPackages = [
    pkgs.pciutils
    pkgs.usbutils
  ];

  # environment.noXlibs = true;
  documentation = {
    enable = false;
    doc.enable = false;
    info.enable = false;
    man.enable = false;
    nixos.enable = false;
  };

  services.pipewire.enable = false;

  programs.command-not-found.enable = false;

  boot.initrd.includeDefaultModules = lib.mkDefault false;

  services.journald.extraConfig = ''
    SystemMaxUse=128M
  '';

  nix.settings = {
    keep-outputs = false;
    keep-derivations = false;
    system-features = [];
  };
}
