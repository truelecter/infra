{config, ...}: let
  inherit (config.lib.topology) mkInternet mkConnection;
in {
  nodes.internet = mkInternet {
    connections = [
      (mkConnection "x290-router" "ether1")
      (mkConnection "depsos" "eth0")
    ];
  };
}
