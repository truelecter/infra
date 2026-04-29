{config, ...}: let
  inherit (config.lib.topology) mkInternet mkConnection mkDevice;
in {
  nodes.internet = mkInternet {
    connections = [
      (mkConnection "x290-router" "ether1")
      (mkConnection "depsos-dmz" "inet")
    ];
  };

  nodes.depsos-dmz = mkDevice "depsos-dmz" {
    interfaces.inet = {};
    interfaces.lan = {};
    connections.lan = mkConnection "depsos" "eth0";
  };
}
