{...}: {
  imports = [
    ./samba.nix

    ./torrent.nix
    ./prowlarr.nix
    ./profilarr.nix
    ./cleanuparr.nix
    ./radarr.nix
    ./sonarr.nix
    ./anime.nix
    ./naming.nix

    ./nginx.nix

    ./jellyfin.nix
    ./seerr.nix
    ./patches/seerr-libraries.nix

    ./users.nix

    ./arr-oauth.nix
  ];

  users.users.truelecter.extraGroups = ["media"];

  nixflix = {
    enable = true;

    stateDir = "/mnt/media-server";
    downloadsDir = "/mnt/public/media/downloads";
    mediaDir = "/mnt/public/media/library";

    mediaUsers = ["share" "truelecter"];

    theme = {
      enable = true;

      name = "overseerr";
    };
  };
}
