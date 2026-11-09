{
  suites,
  profiles,
  ...
}: {
  imports =
    suites.base
    ++ [
      profiles.common.remote-builder
      profiles.nixos.https-certificate-issuer

      ./hardware-configuration.nix

      ./db/postgres.nix
      ./db/mongo.nix

      ./vpn/wireguard.nix
      ./vpn/tailscale-exit-node.nix

      ./zabbix.nix

      ./bots/pandora
      ./bots/asf.nix

      ./nginx.nix

      ./nix-cache
      ./nix-builder.nix

      ./sso.nix
    ];

  networking.networkmanager = {
    enable = false;
  };

  # Cloudflare pulls NARs from nix-proxy over links with ~6% loss, where cubic
  # caps each connection at a few hundred KB/s. BBR doesn't back off on loss.
  boot.kernelModules = ["tcp_bbr"];
  boot.kernel.sysctl = {
    "net.core.default_qdisc" = "fq";
    "net.ipv4.tcp_congestion_control" = "bbr";
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
