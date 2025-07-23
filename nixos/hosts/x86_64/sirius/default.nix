{suites, ...}: {
  imports =
    suites.base
    ++ suites._3d-printing
    ++ [
      ./hardware-configuration.nix
      ./wifi.nix
      ./network-switch.nix
      ./spoolman.nix
      ./home-assistant
      ./unifi.nix
      # ./ide.nix
    ];

  networking.firewall.enable = false;

  system.stateVersion = "24.11";
}
