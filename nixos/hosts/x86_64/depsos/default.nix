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

      ./hardware-configuration.nix

      ./db/postgres.nix
      ./db/mongo.nix

      ./vpn/wireguard.nix
      ./vpn/tailscale-exit-node.nix

      ./zabbix.nix

      ./bots/pandora
      ./bots/asf.nix

      ./ssl.nix
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

  services.journald.extraConfig = ''
    SystemMaxUse=512M
  '';

  systemd.services.NetworkManager-wait-online.enable = false;
  services.openssh.ports = [22 2265];

  system.stateVersion = "22.05";
}
