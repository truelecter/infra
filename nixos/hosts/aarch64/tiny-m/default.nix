{suites, ...}: {
  imports =
    suites.base
    ++ suites._3d-printing
    ++ suites.raspberry
    ++ [
      ./hardware-configuration.nix
      ./klipper
      ./network.nix
      # ./wifi.nix
    ];

  networking .firewall.enable = false;

  system.stateVersion = "24.11";

  users.users.truelecter = {
    extraGroups = ["video" "gpio"];
  };
}
