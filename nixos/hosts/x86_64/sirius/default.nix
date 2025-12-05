{suites, ...}: {
  imports =
    suites.base
    ++ suites._3d-printing
    ++ [
      ./hardware-configuration.nix
      ./wifi.nix
      ./network-switch.nix
      ./3dprint
      ./home-assistant
      ./unifi.nix
      ./ide.nix
      ./bluetooth.nix
      ./topology.nix
    ];

  networking.firewall.enable = false;

  system.stateVersion = "24.11";
}
