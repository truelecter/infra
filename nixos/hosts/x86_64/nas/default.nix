{
  suites,
  profiles,
  inputs,
  ...
}: {
  imports =
    suites.base
    ++ [
      inputs.nixflix.nixosModules.default
      inputs.self.modules.nixos.nixflix-cleanuparr

      profiles.common.remote-builder
      profiles.nixos.fs.zfs
      profiles.nixos.https-certificate-issuer

      profiles.nixos.containers.docker

      ./media-server

      ./hardware-configuration.nix
      ./zfs-mounts.nix
      ./video-card.nix
      ./external.nix
      ./postgres.nix
      ./autosuspend.nix
    ];

  networking = {
    networkmanager.enable = false;
    firewall.enable = false;
    hostId = "00000000";

    # Static instead of DHCP: dhcpcd drops the routes when the link goes down
    # during suspend and needs ~10 s to rebind after resume (see autosuspend.nix).
    # Same address as the reservation in sirius/network-switch.nix.
    useDHCP = false;
    interfaces.enp4s0.ipv4.addresses = [
      {
        address = "10.3.0.132";
        prefixLength = 24;
      }
    ];
    defaultGateway = "10.3.0.129";
    nameservers = ["10.3.0.1"];
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
