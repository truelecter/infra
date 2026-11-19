{config, ...}: {
  catalog.networks = {
    # Home LAN behind the Mikrotik router, which serves DHCP for all of it.
    x290 = {
      cidr = "10.3.0.0/24";
      nameservers = [config.catalog.devices.x290-router.net.x290.ip];
    };

    # The x290 half sirius bridges (sirius/network-switch.nix) and joins to the
    # router's half with proxy ARP. sirius relays its DHCP to the router.
    x290-sirius.cidr = "10.3.0.128/25";

    tailscale = {
      cidr = "100.64.0.0/10";
      domain = "saga-monitor.ts.net";
    };
  };
}
