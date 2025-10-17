{suites, ...}: {
  imports =
    suites.base
    ++ suites._3d-printing
    ++ suites.rpi02
    ++ [
      ./hardware-configuration.nix
      ./camera.nix
      ./network.nix
      ./wifi.nix
      ./usb-eth.nix
    ];

  networking.firewall.enable = false;

  system.stateVersion = "25.05";

  users.users.truelecter = {
    extraGroups = ["video" "gpio"];
  };
}
