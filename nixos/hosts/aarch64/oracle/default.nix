{
  suites,
  profiles,
  ...
}: {
  imports =
    suites.base
    ++ suites.minecraft-server
    ++ [
      profiles.common.remote-builder
      profiles.common.github-actions-builder

      ./hardware-configuration.nix
      ./minecraft-servers
    ];

  systemd.services.NetworkManager-wait-online.enable = false;

  services.vnstat.enable = true;

  virtualisation.podman = {
    enable = true;
    dockerCompat = true;
    dockerSocket.enable = true;
  };
}
