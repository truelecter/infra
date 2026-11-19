# DHCP on the root router for both scopes of x290 (catalog `subnetOf`):
# x290-router on the router's bridge, and x290-sirius relayed from sirius'
# bridge. Leases come from catalog hosts and devices with an x290 address and
# a MAC; `privateMac` ones read theirs from `var.private_macs`.
{
  lib,
  catalog,
  ...
}: let
  inherit (catalog.networks) x290 x290-router x290-sirius;
  router = catalog.devices.x290-router.net.x290.ip;
  sirius = catalog.hosts.sirius.net.x290.ip;

  ipToInt = ip: lib.foldl' (acc: part: acc * 256 + lib.toInt part) 0 (lib.splitString "." ip);
  inNetwork = net: ip: let
    size = lib.foldl' (acc: _: acc * 2) 1 (lib.range 1 (32 - net.prefixLength));
  in
    ipToInt ip / size == ipToInt (lib.head (lib.splitString "/" net.cidr)) / size;

  reserved = lib.filterAttrs (_: n: n.net ? x290 && n.net.x290.ip != null && (n.net.x290.mac != null || n.net.x290.privateMac)) (catalog.hosts // catalog.devices);
  key = lib.replaceStrings ["-"] ["_"];
in {
  variable.private_macs = {
    type = "map(string)";
    sensitive = true;
    description = "MACs of catalog nodes with `privateMac`, by node name, from secrets/terraform.yaml.";
  };

  resource = {
    routeros_ip_pool = {
      # The factory pool.
      dhcp = {
        name = "dhcp";
        ranges = [x290-router.dhcpPool];
      };
      sirius = {
        name = "sirius";
        ranges = [x290-sirius.dhcpPool];
      };
    };

    routeros_ip_dhcp_server = {
      # The factory server.
      defconf = {
        name = "defconf";
        interface = "bridge";
        address_pool = "\${routeros_ip_pool.dhcp.name}";
        lease_time = "1d";
        dynamic_lease_identifiers = "client-mac,client-id";
      };
      sirius = {
        name = "sirius-relay";
        interface = "bridge";
        relay = sirius;
        address_pool = "\${routeros_ip_pool.sirius.name}";
        # Long enough to ride out an outage of sirius' Wi-Fi uplink.
        lease_time = "1d";
        # RouterOS' default, which the provider otherwise keeps clearing.
        dynamic_lease_identifiers = "client-mac,client-id";
      };
    };

    # Both scopes hand out the whole /24; clients behind sirius reach the
    # router's half through its proxy ARP.
    routeros_ip_dhcp_server_network = {
      defconf = {
        address = x290.cidr;
        gateway = router;
        netmask = x290.prefixLength;
        dns_server = x290.nameservers;
        comment = "defconf";
      };
      sirius = {
        address = x290-sirius.cidr;
        gateway = sirius;
        netmask = x290.prefixLength;
        dns_server = x290.nameservers;
      };
    };

    routeros_ip_dhcp_server_lease = lib.mapAttrs' (name: n: let
      a = n.net.x290;
    in
      lib.nameValuePair (key name) ({
          address = a.ip;
          mac_address =
            if a.privateMac
            then "\${upper(var.private_macs[\"${name}\"])}"
            else lib.toUpper a.mac;
          server =
            if inNetwork x290-sirius a.ip
            then "\${routeros_ip_dhcp_server.sirius.name}"
            else "\${routeros_ip_dhcp_server.defconf.name}";
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
