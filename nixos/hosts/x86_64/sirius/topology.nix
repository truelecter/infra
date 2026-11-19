{catalog, ...}: {
  topology.self = {
    # br-switch is the homelab segment of x290, not a separate network: same
    # subnet, joined to the router's half by proxy ARP.
    interfaces.br-switch.network = "x290";

    services.dhcp-relay = {
      name = "DHCP relay";
      info = "br-switch -> ${catalog.devices.x290-router.net.x290.ip}";
    };
  };
}
