{
  suites,
  profiles,
  inputs,
  ...
}: {
  imports =
    suites.base
    ++ [
      inputs.nixarr.nixosModules.default

      profiles.common.remote-builder
      profiles.nixos.fs.zfs

      profiles.nixos.containers.docker

      ./media-server

      ./hardware-configuration.nix
      ./zfs-mounts.nix
      # ./torrent.nix
      ./video-card.nix
      ./external.nix
      ./postgres.nix
    ];

  networking = {
    networkmanager.enable = false;
    firewall.enable = false;
    hostId = "00000000";
  };

  services.vnstat.enable = true;

  system.stateVersion = "22.05";
}
