{
  config,
  lib,
  ...
}: {
  # Media services on the NAS. Their DNS records point at sirius, whose wake
  # proxy forwards to the NAS (see sirius/nas-wake.nix).
  catalog.services =
    lib.genAttrs [
      # oauth2-proxy portal for the *arr services, see nas/media-server/arr-oauth.nix.
      "arr"
      "immich"
      "jellyfin"
      "prowlarr"
      "qbittorrent"
      "radarr"
      "seerr"
      "sonarr"
    ] (_: {
      host = "nas";
      via = "sirius";
      domain = config.catalog.domains.media;
    });
}
