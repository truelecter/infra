{
  lib,
  config,
  catalog,
  ...
}: let
  mediaBaseDomain = catalog.domains.media;
  acmeMail = "andrew.panassiouk@gmail.com";

  # Every vhost under the media domain needs a catalog.services entry: that's
  # where its DNS record and SSO URLs come from.
  served = lib.filter (lib.hasSuffix ".${mediaBaseDomain}") (lib.attrNames config.services.nginx.virtualHosts);
  catalogued = lib.mapAttrsToList (_: s: s.fqdn) (lib.filterAttrs (_: s: s.host == "nas") catalog.services);
  missing = lib.subtractLists catalogued served;
in {
  assertions = [
    {
      assertion = missing == [];
      message = "nginx serves ${lib.concatStringsSep ", " missing} without a catalog.services entry (parts/catalog/services.nix)";
    }
  ];

  security.acme.certs = {
    "${mediaBaseDomain}" = {
      email = acmeMail;
      domain = "*.${mediaBaseDomain}";
    };
  };

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
