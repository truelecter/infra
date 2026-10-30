{config, ...}: {
  catalog.networks = {
    # Home LAN behind the Mikrotik router. sirius bridges its own half
    # (10.3.0.128/25, see sirius/network-switch.nix) and serves DHCP there.
    x290 = {
      cidr = "10.3.0.0/24";
      nameservers = [config.catalog.devices.x290-router.net.x290.ip];
    };

    tailscale.cidr = "100.64.0.0/10";

    # depsos hub, see depsos/vpn/wireguard.nix.
    wireguard.cidr = "10.7.0.0/24";
  };
}
