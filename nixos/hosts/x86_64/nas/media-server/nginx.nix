{
  lib,
  catalog,
  ...
}: let
  mediaBaseDomain = catalog.domains.media;
in {
  # Email from https-certificate-issuer.
  security.acme.certs.${mediaBaseDomain}.domain = "*.${mediaBaseDomain}";

  nixflix = {
    jellyfin.network.localNetworkAddresses = lib.mkForce [];
    radarr.config.hostConfig.bindAddress = "0.0.0.0";
    sonarr.config.hostConfig.bindAddress = "0.0.0.0";
    prowlarr.config.hostConfig.bindAddress = "0.0.0.0";

    jellyfin.subdomain = catalog.services.jellyfin.subdomain;
    prowlarr.subdomain = catalog.services.prowlarr.subdomain;
    radarr.subdomain = catalog.services.radarr.subdomain;
    seerr.subdomain = catalog.services.seerr.subdomain;
    sonarr.subdomain = catalog.services.sonarr.subdomain;
    torrentClients.qbittorrent.subdomain = catalog.services.qbittorrent.subdomain;

    nginx = {
      enable = true;
      addHostsEntries = true;
      domain = "${mediaBaseDomain}";
      enableACME = true;
      forceSSL = true;
    };
  };
}
