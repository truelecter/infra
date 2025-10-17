{suites, ...}: {
  imports =
    suites.base
    ++ suites._3d-printing
    ++ suites.rpi4
    ++ [
      ./camera.nix
      ./hardware-configuration.nix
      ./wifi.nix
      ./klipper
      ./network.nix
    ];

  system.stateVersion = "24.11";

  users.users.truelecter = {
    extraGroups = ["video" "gpio"];
  };
}
