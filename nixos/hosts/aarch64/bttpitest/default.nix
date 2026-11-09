{
  suites,
  overlays,
  ...
}: {
  imports =
    suites._3d-printing
    ++ suites.base
    ++ suites.rockchip
    ++ [
      ./hardware-configuration.nix
      ./klipper-screen-test.nix
      ./moonraker.nix
    ];

  nixpkgs.overlays = [
    overlays.btt-pi-v2
  ];

  systemd.services.NetworkManager-wait-online.enable = false;

  networking = {
    firewall.enable = false;
  };

  system.stateVersion = "24.11";
}
