{config, ...}: {
  services.tailscale = {
    enable = true;
  };

  topology.self = {
    interfaces.tailscale0 = {
      virtual = true;
      network = "tailscale";
      type = "tailscale";
      physicalConnections = [
        (config.lib.topology.mkConnection "tailscale" "*")
      ];
    };
  };
}
