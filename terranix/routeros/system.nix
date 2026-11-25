{
  lib,
  catalog,
  ...
}: let
  inherit (catalog.networks) x290;
  router = catalog.devices.x290-router.net.x290.ip;
  ap = {provider = "routeros.ap";};

  units = {
    x290-router = {
      provider = {};
      # Set by an older RouterOS; new bridges default to long.
      bridge.port_cost_mode = "short";
      ports = ["ether2" "ether3" "ether4" "ether5" "wifi1" "wifi2"];
    };
    # The AP bridges its uplink too.
    x290-ap = {
      provider = ap;
      bridge = {};
      ports = ["ether1" "ether2" "ether3" "ether4" "ether5" "wifi1" "wifi2"];
    };
  };

  key = lib.replaceStrings ["-"] ["_"];
  perUnit = f: lib.concatMapAttrs (name: u: {${key name} = f name u // u.provider;}) units;
in {
  resource = {
    routeros_interface_bridge = perUnit (_: u: {name = "bridge";} // u.bridge);

    routeros_interface_bridge_port = lib.concatMapAttrs (name: u:
      lib.listToAttrs (map (interface:
        lib.nameValuePair "${key name}_${interface}" ({
            bridge = "\${routeros_interface_bridge.${key name}.name}";
            inherit interface;
          }
          // u.provider))
      u.ports))
    units;

    routeros_ip_address = perUnit (name: _: {
      address = "${catalog.devices.${name}.net.x290.ip}/${toString x290.prefixLength}";
      interface = "\${routeros_interface_bridge.${key name}.name}";
    });

    # Only the resolvers in routeros_ip_dns, not the ISP's.
    routeros_ip_dhcp_client.x290_router_ether1 = {
      interface = "ether1";
      use_peer_dns = false;
    };

    routeros_ip_dns = {
      x290_router = {
        servers = ["1.1.1.1" "8.8.8.8"];
        allow_remote_requests = true;
      };
      x290_ap =
        {
          servers = x290.nameservers;
          allow_remote_requests = false;
        }
        // ap;
    };

    # The AP reaches the internet through the router like any LAN client.
    routeros_ip_route.x290_ap_default =
      {
        dst_address = "0.0.0.0/0";
        gateway = router;
      }
      // ap;

    routeros_system_ntp_client = perUnit (_: _: {
      enabled = true;
      servers = ["time.cloudflare.com"];
    });

    routeros_system_clock = perUnit (_: _: {time_zone_name = "Europe/Kiev";});

    routeros_ip_neighbor_discovery_settings.x290_router.discover_interface_list = "LAN";

    routeros_tool_mac_server.x290_router.allowed_interface_list = "LAN";
    routeros_tool_mac_server_winbox.x290_router.allowed_interface_list = "LAN";

    # No IPv6 from the ISP, so nothing to advertise.
    routeros_ipv6_neighbor_discovery = perUnit (_: _: {
      interface = "all";
      disabled = true;
    });

    routeros_ip_ssh_server = perUnit (_: _: {strong_crypto = true;});

    routeros_ip_smb = perUnit (_: _: {enabled = "no";});

    routeros_system_led_settings.x290_router.all_leds_off = "immediate";
  };
}
