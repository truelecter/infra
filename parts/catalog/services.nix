{
  config,
  lib,
  ...
}: let
  inherit (config.catalog) domains;
in {
  catalog.services =
    # Media services on the NAS. Their DNS records point at sirius, whose wake
    # proxy forwards to the NAS (see sirius/nas-wake.nix).
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
      domain = domains.media;
    })
    # Public services on depsos.
    // lib.mapAttrs (_: s:
      {
        host = "depsos";
        public = true;
        domain = domains.main;
      }
      // s) {
      asf = {};
      kanidm.subdomain = "auth";
      nix-cache = {};
      # ncro, a caching proxy in front of cache.nixos.org and others.
      nix-proxy = {};
      pandora = {
        domain = domains.pandora;
        subdomain = "data";
      };
    }
    # BlueMap web maps of the Minecraft servers, see depsos/minecraft-servers.
    // lib.listToAttrs (map (instance:
      lib.nameValuePair "bluemap-${instance}" {
        host = "depsos";
        public = true;
        domain = domains.main;
        subdomain = instance;
      }) ["cae" "e9e" "litv3" "vh3"]);
}
