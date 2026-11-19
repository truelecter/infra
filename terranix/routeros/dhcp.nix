# DHCP on the root router: sirius' half (catalog.networks.x290-sirius) comes
# relayed from sirius' bridge. The router's own half stays on the factory
# `defconf` server, pool and network.
{
  lib,
  catalog,
  ...
}: let
  inherit (catalog.networks) x290 x290-sirius;
  sirius = catalog.hosts.sirius.net.x290.ip;

  ipToInt = ip: lib.foldl' (acc: part: acc * 256 + lib.toInt part) 0 (lib.splitString "." ip);
  halfSize = lib.foldl' (acc: _: acc * 2) 1 (lib.range 1 (32 - x290-sirius.prefixLength));
  inSiriusHalf = ip: ipToInt ip / halfSize == ipToInt (lib.head (lib.splitString "/" x290-sirius.cidr)) / halfSize;

  # Every catalog host and device with an x290 address and MAC.
  reserved = lib.filterAttrs (_: n: n.net ? x290 && n.net.x290.ip != null && n.net.x290.mac != null) (catalog.hosts // catalog.devices);
  key = lib.replaceStrings ["-"] ["_"];
in {
  resource = {
    routeros_ip_pool.sirius = {
      name = "sirius";
      ranges = ["10.3.0.200-10.3.0.225"];
    };

    routeros_ip_dhcp_server.sirius = {
      name = "sirius-relay";
      interface = "bridge";
      relay = sirius;
      address_pool = "\${routeros_ip_pool.sirius.name}";
      # Long enough to ride out an outage of sirius' Wi-Fi uplink.
      lease_time = "1d";
      # RouterOS' default, which the provider otherwise keeps clearing.
      dynamic_lease_identifiers = "client-mac,client-id";
    };

    # Clients behind sirius see the whole /24 through its proxy ARP.
    routeros_ip_dhcp_server_network.sirius = {
      address = x290-sirius.cidr;
      gateway = sirius;
      netmask = x290.prefixLength;
      dns_server = x290.nameservers;
    };

    routeros_ip_dhcp_server_lease = lib.mapAttrs' (name: n: let
      a = n.net.x290;
    in
      lib.nameValuePair (key name) ({
          address = a.ip;
          mac_address = lib.toUpper a.mac;
          server =
            if inSiriusHalf a.ip
            then "\${routeros_ip_dhcp_server.sirius.name}"
            else "defconf";
          comment = name;
        }
        // lib.optionalAttrs (a.dhcp.nameservers != []) {
          dhcp_option = "\${routeros_ip_dhcp_server_option.${key name}_dns.name}";
        }))
    reserved;

    # Per-lease DNS servers (option 6), `net.x290.dhcp.nameservers`.
    routeros_ip_dhcp_server_option = lib.mapAttrs' (name: n:
      lib.nameValuePair "${key name}_dns" {
        name = "${name}-dns";
        code = 6;
        value = lib.concatMapStrings (ip: "'${ip}'") n.net.x290.dhcp.nameservers;
      })
    (lib.filterAttrs (_: n: n.net.x290.dhcp.nameservers != []) reserved);
  };
}
