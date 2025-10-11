{
  config,
  pkgs,
  ...
}: {
  imports = [
    ./samba.nix

    ./torrent.nix
    ./recyclarr
  ];

  nixarr = {
    enable = true;

    mediaDir = "/mnt/public/media";
    mediaUsers = ["share" "truelecter"];
    stateDir = "/mnt/nixarr";

    jellyfin.enable = true;

    bazarr.enable = true;
    sonarr.enable = true;
    radarr.enable = true;
    prowlarr.enable = true;
    jellyseerr.enable = true;
  };
}
