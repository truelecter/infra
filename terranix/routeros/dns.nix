{
  lib,
  catalog,
  ...
}: let
  # `local` is mDNS's: macOS, iOS and Linux with nss-mdns never ask the router
  # for it, so only clients that send it to unicast DNS see these.
  zones = [catalog.networks.x290.domain "local"];

  nodes = lib.filterAttrs (_: n: n.net ? x290 && n.net.x290.ip != null) (catalog.hosts // catalog.devices);
in {
  resource.routeros_ip_dns_record = lib.concatMapAttrs (name: n:
    lib.listToAttrs (map (zone:
      lib.nameValuePair "${lib.replaceStrings ["-"] ["_"] name}_${zone}" {
        name = "${name}.${zone}";
        address = n.net.x290.ip;
        type = "A";
      })
    zones))
  nodes;
}
