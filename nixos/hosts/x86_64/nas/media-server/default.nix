{...}: {
  imports = [
    ./samba.nix

    ./torrent.nix
    # ./recyclarr
    ./prowlarr.nix
    ./profilarr.nix
  ];

  nixarr = {
    enable = true;

    mediaDir = "/mnt/public/media";
    mediaUsers = ["share" "truelecter"];
    stateDir = "/mnt/nixarr";

    jellyfin.enable = true;

    sonarr = {
      enable = true;
      settings-sync.transmission.enable = true;
    };

    radarr = {
      enable = true;
      settings-sync.transmission.enable = true;
    };

    seerr.enable = true;
  };

  services.sonarr.settings.auth.required = "DisabledForLocalAddresses";
  services.radarr.settings.auth.required = "DisabledForLocalAddresses";
}
