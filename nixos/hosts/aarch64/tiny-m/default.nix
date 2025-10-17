{suites, ...}: {
  imports =
    suites.base
    ++ suites._3d-printing
    ++ suites.rpi4
    ++ [
      ./hardware-configuration.nix
      ./klipper
      ./network.nix
      # ./wifi.nix
    ];

  system.stateVersion = "24.11";

  users.users.truelecter = {
    extraGroups = ["video" "gpio"];
  };
}
