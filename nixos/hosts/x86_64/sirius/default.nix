{
  suites,
  profiles,
  ...
}: {
  imports =
    suites.base
    ++ suites._3d-printing
    ++ [
      profiles.nixos.fs.zfs
      ./hardware-configuration.nix
      ./wifi.nix
      ./network-switch.nix
      ./3dprint
      ./home-assistant
      ./ide.nix
      ./bluetooth.nix
      ./topology.nix
      ./unifi-os-server.nix
    ];

  networking.firewall.enable = false;

  system.stateVersion = "24.11";
}
