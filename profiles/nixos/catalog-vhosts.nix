# Keeps nginx in step with catalog.services on this host: every vhost under a
# service domain is a catalog service of this host, and every catalog service
# of this host has a vhost. DNS records and SSO URLs come from the catalog, so
# a vhost missing there has neither.
{
  lib,
  config,
  catalog,
  ...
}: let
  host = config.networking.hostName;

  domains = lib.unique (lib.mapAttrsToList (_: s: s.domain) catalog.services);
  fqdns = lib.mapAttrsToList (_: s: s.fqdn) (lib.filterAttrs (_: s: s.host == host) catalog.services);

  vhosts = lib.filter (name: lib.any (d: lib.hasSuffix ".${d}" name) domains) (lib.mapAttrsToList (name: v:
    if v.serverName != null
    then v.serverName
    else name)
  config.services.nginx.virtualHosts);

  uncatalogued = lib.subtractLists fqdns vhosts;
  unserved = lib.subtractLists vhosts fqdns;
in {
  assertions = [
    {
      assertion = uncatalogued == [];
      message = "nginx serves ${lib.concatStringsSep ", " uncatalogued} without a catalog.services entry for ${host} (parts/catalog/services.nix)";
    }
    {
      assertion = unserved == [];
      message = "catalog.services puts ${lib.concatStringsSep ", " unserved} on ${host}, but nginx has no vhost for it";
    }
  ];
}
