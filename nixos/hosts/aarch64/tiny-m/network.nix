{
  networking = {
    firewall.enable = false;
    useDHCP = true;
    useNetworkd = true;
  };

  services.resolved.enable = true;

  systemd.network = {
    enable = true;
    wait-online.timeout = 0;
  };

  # Wired to the USW Flex, see parts/topology/routers.nix.
  topology.self.interfaces.end0 = {};
}
