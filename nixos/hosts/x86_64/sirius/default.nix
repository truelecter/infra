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
      ./ide.nix
      ./bluetooth.nix
      ./topology.nix
      ./unifi-os-server.nix
    ];

  networking.firewall.enable = false;

  system.stateVersion = "24.11";
}
