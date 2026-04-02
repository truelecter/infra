{
  suites,
  profiles,
  users,
  modulesPath,
  ...
}: {
  imports =
    [
      profiles.common.caches
      profiles.common.networking.tailscale

      profiles.nixos.core
      profiles.nixos.secrets.common

      users.nixos.truelecter-micro
    ]
    ++ suites._3d-printing
    ++ suites.rpi02
    ++ [
      ./hardware-configuration.nix
      ./camera.nix
      ./network.nix
      ./wifi.nix
      ./usb-eth.nix

      "${modulesPath}/profiles/perlless.nix"
    ];

  networking.firewall.enable = false;

  system.stateVersion = "25.05";

  users.users.truelecter = {
    extraGroups = ["video" "gpio"];
  };
}
