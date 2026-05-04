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

      ./hardware-configuration.nix
      ./minecraft-servers
      ./github-actions-builder.nix
    ];

  systemd.services.NetworkManager-wait-online.enable = false;

  services.vnstat.enable = true;

  virtualisation.podman = {
    enable = true;
    dockerCompat = true;
    dockerSocket.enable = true;
  };
}
