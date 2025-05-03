{suites, ...}: {
  imports =
    suites.base
    ++ suites._3d-printing
    ++ suites.raspberry
    ++ [
      ./camera.nix
      ./hardware-configuration.nix
      ./wifi.nix
      ./klipper
      ./network.nix
    ];

  networking .firewall.enable = false;

  system.stateVersion = "24.11";

  users.users.truelecter = {
    extraGroups = ["video" "gpio"];
  };

  nix.settings = {
    keep-outputs = false;
    keep-derivations = false;
    system-features = [];
  };
}
