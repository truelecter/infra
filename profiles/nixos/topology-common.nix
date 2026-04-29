{
  config,
  lib,
  ...
}:
lib.mkMerge [
  (lib.mkIf config.services.tailscale.enable {
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
  })
]
