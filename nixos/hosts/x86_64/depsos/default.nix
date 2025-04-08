{
  inputs,
  suites,
  profiles,
  overlays,
  ...
}: {
  imports =
    suites.base
    ++ [
      profiles.common.remote-builder
      profiles.nixos.containers.docker

      ./hardware-configuration.nix
      ./postgres.nix
      ./mongo.nix
      ./wireguard.nix
      ./tailscale-exit-node.nix
      ./zabbix.nix
      ./journal.nix

      ./pandora
      ./asf.nix
    ];

  networking.networkmanager = {
    enable = false;
  };

  # we are in tight free space situation
  nix.settings = let
    MB = 1024 * 1024;
  in {
    min-free = 100 * MB;
    max-free = 500 * MB;
  };

  systemd.services.NetworkManager-wait-online.enable = false;
  services.openssh.ports = [22 2265];

  system.stateVersion = "22.05";
}
