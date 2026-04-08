{
  suites,
  profiles,
  users,
  ...
}: {
  imports =
    [
      profiles.common.caches
      profiles.common.networking.tailscale

      profiles.nixos.core
      profiles.nixos.secrets.common

      users.nixos.truelecter
    ]
    ++ suites._3d-printing
    ++ suites.rpi02
    ++ [
      ./hardware-configuration.nix
      ./camera.nix
      ./network.nix
      ./wifi.nix
      ./usb-eth.nix
      ./watchdog.nix
      # ./almost-perlless.nix
      ./unoom.nix
    ];

  networking.firewall.enable = false;

  system.stateVersion = "25.05";

  users.users.truelecter = {
    extraGroups = ["video" "gpio"];
  };
}
