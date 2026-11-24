{
  lib,
  catalog,
  ...
}: let
  inherit (catalog.networks.x290) domain;
  nodes = lib.filterAttrs (_: n: n.net ? x290 && n.net.x290.ip != null) (catalog.hosts // catalog.devices);
in {
  resource.routeros_ip_dns_record = lib.mapAttrs' (name: n:
    lib.nameValuePair "${lib.replaceStrings ["-"] ["_"] name}_${domain}" {
      name = "${name}.${domain}";
      address = n.net.x290.ip;
      type = "A";
    })
  nodes;
}
