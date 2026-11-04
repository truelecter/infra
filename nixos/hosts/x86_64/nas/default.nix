{
  suites,
  profiles,
  inputs,
  catalog,
  ...
}: let
  x290 = catalog.networks.x290;
in {
  imports =
    suites.base
    ++ [
      inputs.nixflix.nixosModules.default
      inputs.self.modules.nixos.nixflix-cleanuparr

      profiles.common.remote-builder
      profiles.nixos.fs.zfs
      profiles.nixos.https-certificate-issuer
      profiles.nixos.catalog-vhosts

      profiles.nixos.containers.docker

      ./media-server

      ./hardware-configuration.nix
      ./zfs-mounts.nix
      ./video-card.nix
      ./external.nix
      ./postgres.nix
      ./autosuspend.nix
      ./immich.nix
      ./immich-pet-tagger.nix
    ];

  networking = {
    networkmanager.enable = false;
    firewall.enable = false;
    hostId = "00000000";

    # Static instead of DHCP: dhcpcd drops the routes when the link goes down
    # during suspend and needs ~10 s to rebind after resume (see autosuspend.nix).
    # Same address as the reservation sirius/network-switch.nix generates.
    useDHCP = false;
    interfaces.lan0.ipv4.addresses = [
      {
        address = catalog.hosts.nas.net.x290.ip;
        inherit (x290) prefixLength;
      }
    ];
    # sirius bridges the NAS' half of x290.
    defaultGateway = catalog.hosts.sirius.net.x290.ip;
    inherit (x290) nameservers;
  };

  # The PCI path, and so the predictable name, shifts when cards come and go
  # (enp4s0 with the GTX 1660 in, enp3s0 without), so name the NIC by MAC.
  # udev applies only the first matching .link file, so Wake-on-LAN lives here
  # too instead of in networking.interfaces.<name>.wakeOnLan.
  systemd.network.links."10-lan0" = {
    matchConfig.PermanentMACAddress = "f4:b5:20:45:4d:2e";
    linkConfig = {
      Name = "lan0";
      WakeOnLan = "magic";
    };
  };

  virtualisation.podman = {
    defaultNetwork.settings = {
      subnets = [
        {
          subnet = "10.88.0.0/16";
          gateway = "10.88.0.1";
        }
      ];
    };
  };

  services.vnstat.enable = true;

  system.stateVersion = "22.05";
}
